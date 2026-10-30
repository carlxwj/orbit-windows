import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import { useHistory } from '../services/store.ts';
import { Chart, type SeriesKey } from './Chart.tsx';
import { Panel } from './ui.tsx';
export function TrendPanel(){
 const history=useHistory();const [selected,setSelected]=useState<SeriesKey[]>(['cpu','gpu','ram']);const [minutes,setMinutes]=useState(5);
 const samples=useMemo(()=>history.filter(s=>s.timestamp>=(history.at(-1)?.timestamp??Date.now())-minutes*60000),[history,minutes]);
 return <Panel title="Activité du système" icon={Activity} className="trend-panel" action={<div className="segmented">{[1,5,10].map(n=><button key={n} className={minutes===n?'selected':''} onClick={()=>setMinutes(n)}>{n} min</button>)}</div>}>
  <div className="chart-legend">{(['cpu','gpu','ram'] as SeriesKey[]).map((key,i)=><button key={key} className={selected.includes(key)?'enabled':''} aria-pressed={selected.includes(key)} onClick={()=>setSelected(previous=>previous.includes(key)?previous.length>1?previous.filter(x=>x!==key):previous:[...previous,key])}><i style={{background:['#6b8cff','#b594ee','#56bfa8'][i]}}/>{key.toUpperCase()}</button>)}<span>Mesures réelles · aucune interpolation</span></div>
  <Chart history={samples} series={selected}/>
 </Panel>;
}
