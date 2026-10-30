import { memo, useId, useMemo, useState } from 'react';
import type { LiveSample } from '../../shared/contracts.ts';
import { format } from './ui.tsx';
export type SeriesKey='cpu'|'gpu'|'ram'|'vram'|'disk'|'temperature'|'download'|'upload';
const definitions:Record<SeriesKey,{label:string;color:string;read:(sample:LiveSample)=>number|null}>={
 cpu:{label:'CPU',color:'#6b8cff',read:s=>s.cpu.value},gpu:{label:'GPU principal',color:'#b594ee',read:s=>s.gpus[0]?.load.value??null},
 ram:{label:'RAM',color:'#56bfa8',read:s=>s.memory.percent},vram:{label:'VRAM principale',color:'#dcab66',read:s=>s.gpus[0]?.used.value!=null&&s.gpus[0]?.total.value?s.gpus[0].used.value!/s.gpus[0].total.value!*100:null},
 disk:{label:'Activité disque',color:'#7cabc3',read:s=>s.diskActivity.value},temperature:{label:'Température GPU',color:'#df8a92',read:s=>s.gpus[0]?.temperature.value??null},
 download:{label:'Réception',color:'#6b8cff',read:s=>s.network.some(n=>n.download.value!==null)?s.network.reduce((n,a)=>n+(a.download.value??0),0):null},upload:{label:'Envoi',color:'#b594ee',read:s=>s.network.some(n=>n.upload.value!==null)?s.network.reduce((n,a)=>n+(a.upload.value??0),0):null}
};
export const Chart=memo(function Chart({history,series=['cpu','gpu','ram'],mini=false,unit='%'}:{history:LiveSample[];series?:SeriesKey[];mini?:boolean;unit?:'%'|'°C'|'B/s'}){
 const uid=useId().replace(/:/g,''),[hover,setHover]=useState<number|null>(null);
 const width=800,height=mini?90:215,padding=mini?2:12;
 const dataset=useMemo(()=>series.map(key=>({key,...definitions[key],values:history.map(definitions[key].read)})),[history,series]);
 const max=unit==='%'?100:Math.max(unit==='°C'?100:1024,...dataset.flatMap(d=>d.values.filter((x):x is number=>x!==null)))*1.1;
 const first=history[0]?.timestamp??0,last=history.at(-1)?.timestamp??first;
 const x=(i:number)=>history.length<2?width/2:(history[i].timestamp-first)/Math.max(1,last-first)*width;
 const y=(v:number)=>height-padding-(Math.max(0,v)/max)*(height-2*padding);
 const selected=hover!==null?Math.max(0,Math.min(history.length-1,hover)):null;
 const showNumber=(n:number)=>unit==='B/s'?`${format(n/1024**2,2)} Mo/s`:`${format(n,1)} ${unit}`;
 return <div className={`chart ${mini?'mini-chart':''}`}>
  {!mini&&<div className="chart-scale"><span>{showNumber(max)}</span><span>{showNumber(max/2)}</span><span>0</span></div>}
  <div className="chart-canvas" onMouseLeave={()=>setHover(null)} onMouseMove={event=>{if(mini||!history.length)return;const rect=event.currentTarget.getBoundingClientRect();const target=first+(event.clientX-rect.left)/rect.width*(last-first);let index=0;for(let i=1;i<history.length;i++)if(Math.abs(history[i].timestamp-target)<Math.abs(history[index].timestamp-target))index=i;setHover(index);}}>
   <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={dataset.map(s=>`${s.label} : ${s.values.at(-1)==null?'non disponible':showNumber(s.values.at(-1)!)}`).join(', ')}>
    {!mini&&[0,25,50,75,100].map(n=><line key={n} x1="0" x2={width} y1={y(max*n/100)} y2={y(max*n/100)} className="chart-grid"/>)}
    <defs>{dataset.map(d=><linearGradient key={d.key} id={`${uid}-${d.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={d.color} stopOpacity=".15"/><stop offset="100%" stopColor={d.color} stopOpacity="0"/></linearGradient>)}</defs>
    {dataset.map(d=>{let gap=true;const path=d.values.map((v,i)=>{if(v===null){gap=true;return '';}const cmd=gap?'M':'L';gap=false;return `${cmd}${x(i).toFixed(2)},${y(v).toFixed(2)}`;}).join(' ');return <g key={d.key}><path d={path} stroke={d.color} strokeWidth={mini?2.4:1.9} fill="none" vectorEffect="non-scaling-stroke"/>{d.values.length===1&&d.values[0]!==null&&<circle cx={x(0)} cy={y(d.values[0])} r="2" fill={d.color}/>}</g>;})}
    {selected!==null&&<line x1={x(selected)} x2={x(selected)} y1="0" y2={height} className="chart-cursor"/>}
   </svg>
   {selected!==null&&history[selected]&&<div className="chart-tooltip" style={{left:`${Math.max(15,Math.min(75,selected/Math.max(1,history.length-1)*100))}%`}}><time>{new Date(history[selected].timestamp).toLocaleTimeString('fr-FR')}</time>{dataset.map(d=><span key={d.key}><i style={{background:d.color}}/>{d.label}<b>{d.values[selected]===null?'—':showNumber(d.values[selected])}</b></span>)}</div>}
   {!history.length&&<span className="chart-waiting">Les premières mesures arrivent…</span>}
  </div>
  {!mini&&<><div className="chart-time"><span>{first?new Date(first).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—'}</span><span>Historique glissant · {history.length} mesures</span><span>Maintenant</span></div><div className="chart-stats">{dataset.map(d=>{const values=d.values.filter((x):x is number=>x!==null);return <div key={d.key}><i style={{background:d.color}}/><strong>{d.label}</strong><span>{values.length?`min ${showNumber(Math.min(...values))} · moy ${showNumber(values.reduce((a,b)=>a+b,0)/values.length)} · max ${showNumber(Math.max(...values))}`:'Non disponible'}</span></div>;})}</div></>}
 </div>;
});
