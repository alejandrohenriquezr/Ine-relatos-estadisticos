import assert from "node:assert/strict";
import test from "node:test";
import {NextRequest} from "next/server";

const originalFetch=globalThis.fetch;
const responseJson=async(response:Response)=>JSON.parse(await response.text());

function database(firstRow:unknown,allRows:unknown[]=[]){return {prepare(sql:string){const statement={args:[] as unknown[],bind(...args:unknown[]){this.args=args;return this},async run(){return{}},async first(){return sql.startsWith("SELECT")?firstRow:null},async all(){return {results:allRows}}};return statement}};}

test.afterEach(()=>{globalThis.fetch=originalFetch;delete (globalThis as typeof globalThis&{__SITES_DB?:unknown}).__SITES_DB});

test("Supermercados responde desde D1 antes de consultar al INE",async()=>{let externalCalls=0;globalThis.fetch=async()=>{externalCalls++;throw new Error("No debe consultar la fuente en la fase caché")};const rows=[{part:"meta",payload:JSON.stringify({kind:"supermarkets",base:"2018",territories:[]})},...Array.from({length:17},(_,i)=>({part:`index:${i}`,payload:"[]"})),...['sales','stores','area'].map(name=>({part:`matrix:${name}`,payload:JSON.stringify({territories:[],seriesByTerritory:{}})}))];(globalThis as typeof globalThis&{__SITES_DB?:unknown}).__SITES_DB=database({cache_key:"k",checked_at:"now"},rows);const {GET}=await import("../app/api/supermarkets-data/route");const response=await GET(new NextRequest("http://test/api/supermarkets-data"));assert.equal(response.status,200);assert.equal((await responseJson(response)).source.cache,"cached");assert.equal(externalCalls,0)});

test("Turismo responde desde D1 antes de consultar al INE",async()=>{let externalCalls=0;globalThis.fetch=async()=>{externalCalls++;throw new Error("No debe consultar la fuente en la fase caché")};const sheets=["1","2","3","4","5","6","7","8","9","10","11","16","22","25","28","31"].map(sheet=>({sheet,payload_json:"{}"}));(globalThis as typeof globalThis&{__SITES_DB?:unknown}).__SITES_DB=database({cache_key:"k",checked_at:"now"},sheets);const {GET}=await import("../app/api/tourism-data/route");const response=await GET(new NextRequest("http://test/api/tourism-data"));assert.equal(response.status,200);assert.equal((await responseJson(response)).source.cache,"cached");assert.equal(externalCalls,0)});

test("Comercio responde desde D1 antes de consultar al INE",async()=>{let externalCalls=0;globalThis.fetch=async()=>{externalCalls++;throw new Error("No debe consultar la fuente en la fase caché")};(globalThis as typeof globalThis&{__SITES_DB?:unknown}).__SITES_DB=database({payload_json:JSON.stringify({kind:"commerce"}),source_url:"source",source_last_modified:"date",checked_at:"now"});const {GET}=await import("../app/api/economic-data/route");const response=await GET(new NextRequest("http://test/api/economic-data?kind=commerce"));assert.equal(response.status,200);assert.equal((await responseJson(response)).source.cache,"cached");assert.equal(externalCalls,0)});
