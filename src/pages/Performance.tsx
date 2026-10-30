import { useState } from 'react';
import { Activity, Gauge } from 'lucide-react';
import { useHistory, useLive, usePrefs, setPreference } from '../services/store.ts';
import { Panel, InfoNote, format, MetricText, size } from '../components/ui.tsx';
import { Chart, type SeriesKey } from '../components/Chart.tsx';
export default function Performance(){
 const history=useHistory(),live=useLive(),prefs=usePrefs();const [gpuIndex,setGpuIndex]=useState(0);
 const mapped=history.map(s=>({...s,gpus:s.gpus[gpuIndex]?[s.gpus[gpuIndex]]:[]}));
 const panels:{title:string;series:SeriesKey[];unit?:'%'|'°C'|'B/s'}[]=[{title:'Processeur',series:['cpu']},{title:'Graphiques',series:['gpu']},{title:'Mémoire vive',series:['ram']},{title:'Mémoire graphique dédiée',series:['vram']},{title:'Activité des disques',series:['disk']},{title:'Trafic réseau',series:['download','upload'],unit:'B/s'}];
 return <><div className="page-toolbar"><span className="live-label"><i/>En direct · historique de cette session</span><label>Intervalle <select value={prefs.interval} onChange={e=>{void setPreference({interval:Number(e.target.value) as typeof prefs.interval});}}>{[1000,3000,5000,10000].map(n=><option key={n} value={n}>{n/1000} seconde{n>1000?'s':''}</option>)}</select></label>{(live?.gpus.length??0)>1&&<label>GPU <select value={gpuIndex} onChange={e=>setGpuIndex(Number(e.target.value))}>{live?.gpus.map((g,i)=><option key={g.id} value={i}>{g.name}</option>)}</select></label>}</div>
  <div className="performance-grid">{panels.map(panel=><Panel key={panel.title} title={panel.title} icon={Activity}><Chart history={mapped} series={panel.series} unit={panel.unit}/></Panel>)}{prefs.temperatures&&<Panel title="Température GPU" icon={Gauge}><Chart history={mapped} series={['temperature']} unit="°C"/></Panel>}</div>
  <Panel title="Processeurs logiques" icon={Gauge}><div className="core-grid">{live?.perCore.map((load,i)=><div className="core" key={i}><span>CPU {i+1}</span><strong>{format(load,1)} %</strong><div className="progress"><i style={{width:`${load}%`}}/></div></div>)}</div></Panel>
  <div className="grid-two"><Panel title="Débits disque"><dl><div className="detail"><dt>Lecture</dt><dd>{live?.diskRead.value==null?'Non disponible':`${size(live.diskRead.value)}/s`}</dd></div><div className="detail"><dt>Écriture</dt><dd>{live?.diskWrite.value==null?'Non disponible':`${size(live.diskWrite.value)}/s`}</dd></div></dl></Panel><Panel title="Capteurs CPU"><dl><div className="detail"><dt>Fréquence actuelle déclarée</dt><dd><MetricText metric={live?.cpuMHz}/></dd></div><div className="detail"><dt>Température CPU</dt><dd><MetricText metric={live?.cpuTemperature}/></dd></div></dl></Panel></div>
  <InfoNote>Les graphes conservent jusqu’à 180 mesures réelles. Une interruption ou une donnée absente crée un espace dans la courbe. Pour AMD et Intel, l’utilisation et la mémoire GPU sont lues via les compteurs Windows ; les autres capteurs peuvent rester indisponibles.</InfoNote>
 </>;
}
