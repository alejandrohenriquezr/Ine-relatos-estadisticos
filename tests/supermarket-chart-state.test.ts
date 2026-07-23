import assert from "node:assert/strict";
import test from "node:test";
import {lastChartPeriods,toggleChartSeries} from "../lib/supermarket-chart-state";

test("el gráfico conserva exactamente las últimas 25 etiquetas",()=>{
  assert.deepEqual(lastChartPeriods(Array.from({length:40},(_,index)=>index)),Array.from({length:25},(_,index)=>index+15));
});

test("activar una variación oculta el nivel",()=>{
  assert.deepEqual(toggleChartSeries({value:true,monthly:false,annual:false,accumulated:false},"annual",true),{value:false,monthly:false,annual:true,accumulated:false});
});

test("activar el nivel oculta todas las variaciones",()=>{
  assert.deepEqual(toggleChartSeries({value:false,monthly:true,annual:true,accumulated:true},"value",true),{value:true,monthly:false,annual:false,accumulated:false});
});

test("los gráficos de índices permiten combinar variaciones",()=>{
  assert.deepEqual(toggleChartSeries({monthly:true,annual:false,accumulated:false},"annual",false),{monthly:true,annual:true,accumulated:false});
});
