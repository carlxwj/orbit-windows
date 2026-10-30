import { Cpu, CircuitBoard, MemoryStick, HardDrive, ArrowUpRight, Keyboard, Mouse, Monitor, Wifi, Volume2, Bluetooth, Shield, Plane, Activity, Moon, ChevronRight } from 'lucide-react';
import type { ComponentType } from 'react';
import { useInventory, useLive, useHistory, usePrefs, navigate, run } from '../services/store.ts';
import { Panel, SettingsLink, size, format, MetricText, InfoNote } from '../components/ui.tsx';
import { Chart, type SeriesKey } from '../components/Chart.tsx';
import { TrendPanel } from '../components/TrendPanel.tsx';
import { fr } from '../i18n/fr.ts';

function Stat({title,icon:Icon,color,reading,unit,caption,series,onClick}:{title:string;icon:ComponentType<{size?:number}>;color:string;reading:string;unit?:string;caption:string;series?:SeriesKey;onClick:()=>void}){
 const history=useHistory();
 return <button className={`stat-card ${color}`} onClick={onClick}><div className="stat-heading"><span className="category-icon"><Icon size={17}/></span><span>{title}</span><ArrowUpRight size={14} className="stat-arrow"/></div><div className="stat-reading">{reading}<small>{unit}</small></div><p title={caption}>{caption}</p>{series&&<Chart history={history.slice(-35)} series={[series]} mini/>}</button>;
}
export default function Overview(){
 const inventory=useInventory(),live=useLive(),prefs=usePrefs();
 const gpu=live?.gpus[0],primary=inventory?.displays.find(d=>d.primary)??inventory?.displays[0];
 const volumes=inventory?.volumes??[],free=volumes.reduce((n,v)=>n+v.free,0),total=volumes.reduce((n,v)=>n+v.total,0);
 const devices=(inventory?.devices??[]).filter(d=>d.presence!=='disconnected'&&!prefs.devices[d.id]?.hidden);
 const keyboard=devices.find(d=>(prefs.devices[d.id]?.category??d.category)==='keyboard');
 const mouse=devices.find(d=>(prefs.devices[d.id]?.category??d.category)==='mouse');
 return <>
  <div className="stats-grid">
   <Stat title="Processeur" icon={Cpu} color="blue" reading={live?.cpu.value==null?'—':format(live.cpu.value,1)} unit="%" caption={inventory?.cpu.model??fr.loading} series="cpu" onClick={()=>navigate('hardware')}/>
   <Stat title="Graphiques" icon={CircuitBoard} color="lavender" reading={gpu?.load.value==null?'—':format(gpu.load.value,1)} unit="%" caption={gpu?.name??inventory?.gpus[0]?.name??'GPU non accessible'} series="gpu" onClick={()=>navigate('performance')}/>
   <Stat title="Mémoire" icon={MemoryStick} color="mint" reading={live?format(live.memory.used/1024**3,1):'—'} unit="Go" caption={live?`${size(live.memory.total)} utilisables · ${format(live.memory.percent)} % utilisés`:fr.loading} series="ram" onClick={()=>navigate('hardware')}/>
   <Stat title="Stockage libre" icon={HardDrive} color="peach" reading={total?format(free/1024**3):'—'} unit="Go" caption={total?`${size(total)} au total · ${volumes.length} volume${volumes.length>1?'s':''}`:'Lecture des volumes…'} onClick={()=>navigate('storage')}/>
  </div>
  <div className="overview-grid"><div className="main-column"><TrendPanel/>
   <Panel title="Votre espace connecté" icon={Monitor} action={<button className="text-button" onClick={()=>navigate('devices')}>Voir les appareils <ChevronRight size={13}/></button>}>
    <div className="connected-grid">
     {[{icon:Keyboard,label:'Clavier',device:keyboard},{icon:Mouse,label:'Souris',device:mouse}].map(({icon:Icon,label,device})=><button className="connected-item" key={label} onClick={()=>navigate('devices')}><span className="device-art"><Icon size={35} strokeWidth={1.2}/></span><strong>{device?(prefs.devices[device.id]?.name||device.name):label}</strong><small>{device?fr.connection[prefs.devices[device.id]?.connection??device.connection]:'Aucun appareil identifié'}</small><span className="device-battery">{device?.battery.value!=null?`${device.battery.value} % de batterie`:fr.batteryUnknown}</span></button>)}
     <button className="connected-item" onClick={()=>navigate('displays')}><span className="device-art"><Monitor size={35} strokeWidth={1.2}/></span><strong>{primary?prefs.monitorNames[primary.id]||primary.name:'Écran principal'}</strong><small>{primary?`${primary.width} × ${primary.height}`:'Lecture native indisponible'}</small><span className="device-battery">{primary?<MetricText metric={primary.refresh}/>:fr.unavailable}</span></button>
    </div>
   </Panel>
  </div><div className="side-column">
   <Panel title="Commandes rapides" icon={Activity}>
    <div className="quick-grid">{([{key:'wifi',icon:Wifi,label:'Wi-Fi',caption:inventory?.wifi.value?.ssid??'Réseaux disponibles'},{key:'bluetooth',icon:Bluetooth,label:'Bluetooth',caption:inventory?.bluetooth.present?'Adaptateur détecté':'Paramètres Windows'},{key:'vpn',icon:Shield,label:'VPN',caption:'Profils et connexion'},{key:'airplane',icon:Plane,label:'Mode avion',caption:'Radios sans fil'}] as const).map(item=><button className={`quick-tile ${item.key==='wifi'&&inventory?.wifi.value?'connected':''}`} key={item.key} onClick={()=>{void run(window.orbit.openSettings(item.key));}}><item.icon size={20}/><ArrowUpRight size={12} className="quick-arrow"/><strong>{item.label}</strong><small>{item.caption}</small></button>)}</div>
    <div className="mini-audio"><Volume2 size={17}/><div><strong>Audio Windows</strong><small>{live?.audio.value?.name??fr.unavailable}</small></div><button className="text-button" onClick={()=>navigate('audio')}>{live?.audio.value?`${live.audio.value.volume} %`:'Configurer'}<ChevronRight size={13}/></button></div>
    <p className="subtle-note">Les commandes réseau ouvrent les réglages Windows.</p>
   </Panel>
   <Panel title="À propos de ce PC" icon={Cpu} className="pc-summary"><dl><div><dt>Ordinateur</dt><dd>{inventory?.system.hostname??'—'}</dd></div><div><dt>Système</dt><dd>{inventory?.system.os??'Windows'}</dd></div><div><dt>Activité</dt><dd>{live?`${Math.floor(live.uptime/3600)} h ${Math.floor(live.uptime%3600/60)} min`:'—'}</dd></div></dl><button className="text-button" onClick={()=>navigate('hardware')}>Toutes les informations <ArrowUpRight size={13}/></button></Panel>
   <button className="focus-callout" onClick={()=>navigate('focus')}><span><Moon size={23}/></span><div><strong>Un peu de concentration.</strong><p>Votre prochain moment de calme.</p></div><ChevronRight size={17}/></button>
  </div></div>
  {inventory?.issues.some(i=>i.collector==='bridge')&&<InfoNote>Le collecteur Windows est temporairement inaccessible. CPU et RAM restent disponibles. Vérifiez que le fichier OrbitBridge.exe a été inclus dans le build.</InfoNote>}
  <div className="overview-footnote"><Shield size={12}/>{fr.local}<span>·</span><SettingsLink target="updates">Windows Update</SettingsLink><span>·</span><SettingsLink target="security">Sécurité Windows</SettingsLink></div>
 </>;
}
