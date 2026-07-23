export type ChartVisibility=Record<string,boolean>;

export function lastChartPeriods<T>(series:T[],count=25):T[]{return series.slice(-count);}

export function toggleChartSeries(current:ChartVisibility,key:string,hasValue:boolean):ChartVisibility{
  if(key==="value")return {value:true,monthly:false,annual:false,accumulated:false};
  const next={...current,[key]:!current[key]};
  if(hasValue)next.value=false;
  return next;
}
