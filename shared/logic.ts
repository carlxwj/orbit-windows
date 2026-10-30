import type {Metric,MetricState,Preferences,Peripheral,NetworkSample} from './contracts.ts';
export const defaults:Preferences={theme:'system',accent:'blue',transparency:true,reducedMotion:false,compact:false,collapsedSidebar:false,page:'overview',interval:3000,temperatures:true,advanced:false,backgroundEco:true,history:false,focusHistory:false,notifications:true,startAtLogin:false,startMinimized:false,closeToTray:false,devices:{},monitorNames:{},monitorPanels:{}};
export function metric<T>(value:T|null,source:string,state:MetricState=value===null?'unsupported':'available',unit?:string):Metric<T>{return {value,state,source,updatedAt:Date.now(),...(unit?{unit}:{})};}
export function percent(value:unknown,source:string):Metric<number>{return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?metric(value,source,'available','%'):metric<number>(null,source,'unsupported','%');}
export interface CpuTimes{times:Record<string,number>}
export function cpuDelta(before:CpuTimes[],after:CpuTimes[]):{total:number|null;cores:number[]}{
 let idle=0,total=0;const cores=after.map((cpu,i)=>{const old=before[i];if(!old)return 0;const delta=Object.keys(cpu.times).reduce((n,k)=>n+cpu.times[k]-(old.times[k]??0),0),wait=cpu.times.idle-old.times.idle;if(delta<=0||wait<0)return 0;idle+=wait;total+=delta;return Math.max(0,Math.min(100,(1-wait/delta)*100));});return {total:total>0?Math.max(0,Math.min(100,(1-idle/total)*100)):null,cores};
}
export function networkRates(previous:{timestamp:number;adapters:{id:string;received:number;sent:number}[]}|null,current:{timestamp:number;adapters:{id:string;name:string;received:number;sent:number}[]}):NetworkSample[]{return current.adapters.map(a=>{const old=previous?.adapters.find(x=>x.id===a.id),seconds=previous?(current.timestamp-previous.timestamp)/1000:0;const valid=!!old&&seconds>0&&a.received>=old.received&&a.sent>=old.sent;return {...a,download:metric(valid?(a.received-old!.received)/seconds:null,'.NET IPv4Statistics',valid?'available':'temporarily_unavailable','B/s'),upload:metric(valid?(a.sent-old!.sent)/seconds:null,'.NET IPv4Statistics',valid?'available':'temporarily_unavailable','B/s')};});}
export function validatePreferences(patch:unknown):Partial<Preferences>{
 if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Préférences invalides.');const output:Record<string,unknown>={};
 for(const [key,value]of Object.entries(patch)){
  if(!Object.hasOwn(defaults,key))throw Error('Préférence inconnue.');
  if(typeof defaults[key as keyof Preferences]==='boolean'){if(typeof value!=='boolean')throw Error('Valeur invalide.');}
  else if(key==='interval'){if(![1000,3000,5000,10000].includes(value as number))throw Error('Intervalle invalide.');}
  else if(key==='theme'){if(!['system','light','dark'].includes(value as string))throw Error('Thème invalide.');}
  else if(key==='accent'){if(!['blue','lavender','graphite'].includes(value as string))throw Error('Accent invalide.');}
  else if(key==='page'){if(!['overview','performance','hardware','devices','displays','storage','network','audio','account','focus','settings'].includes(value as string))throw Error('Page invalide.');}
  else if(key==='devices'){
   if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>500)throw Error('Périphériques invalides.');
   for(const [id,item]of Object.entries(value)){if(!/^[a-f0-9]{24}$/.test(id)||!item||typeof item!=='object')throw Error('Identifiant invalide.');for(const[k,v]of Object.entries(item)){
    if(k==='name'){if(typeof v!=='string'||v.length>100)throw Error('Nom invalide.');}
    else if(k==='category'){if(!['keyboard','mouse','headset','controller','audio','receiver','other'].includes(v as string))throw Error('Catégorie invalide.');}
    else if(k==='connection'){if(!['usb','bluetooth','wireless_2_4g','wireless_receiver','unknown'].includes(v as string))throw Error('Connexion invalide.');}
    else if(k==='favorite'||k==='hidden'){if(typeof v!=='boolean')throw Error('État invalide.');}
    else if(k==='image'){if(typeof v!=='string'||!/^device-[a-f0-9]{24}\.png$/.test(v))throw Error('Image invalide.');}
    else throw Error('Propriété inconnue.');
   }}
  }else{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>50||Object.entries(value).some(([k,v])=>k.length>200||['__proto__','prototype','constructor'].includes(k)||typeof v!=='string'||v.length>100))throw Error('Noms d’écran invalides.');}
  output[key]=value;
 }return output as Partial<Preferences>;
}
export function validateAudio(patch:unknown):{volume?:number;muted?:boolean}{if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Réglage audio invalide.');const p=patch as Record<string,unknown>;if(Object.keys(p).some(k=>k!=='volume'&&k!=='muted')||!Object.keys(p).length)throw Error('Réglage audio invalide.');if('volume'in p&&(!Number.isInteger(p.volume)||Number(p.volume)<0||Number(p.volume)>100))throw Error('Volume invalide.');if('muted'in p&&typeof p.muted!=='boolean')throw Error('État muet invalide.');return p as {volume?:number;muted?:boolean};}
export function effectiveInterval(interval:number,visible:boolean,eco:boolean,suspended:boolean):number|null{return suspended?null:!visible&&eco?60000:interval;}
export function rankSearch(query:string,items:{id:string;title:string;description:string;keywords:string}[]){const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();const terms=norm(query).trim().split(/\s+/).filter(Boolean);return items.map(item=>({...item,score:terms.reduce((n,t)=>n+(norm(item.title).startsWith(t)?10:norm(item.title).includes(t)?6:norm(`${item.description} ${item.keywords}`).includes(t)?2:-100),0)})).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);}
export interface RawDevice{instanceId:string;container:string;parent:string;name:string;manufacturer:string;className:string;battery:number|null;hardwareIds:string;status:string;batterySource?:string;batteryState?:MetricState}
export function groupDevices(rows:RawDevice[]):Peripheral[]{
 const groups=new Map<string,RawDevice[]>();for(const row of rows){const empty=!row.container||/^\{?0{8}-0{4}-0{4}-0{4}-0{12}\}?$/.test(row.container);const key=empty?(/^HID\\/i.test(row.instanceId)&&/^USB\\/i.test(row.parent)?row.parent:row.instanceId):row.container.toLowerCase();groups.set(key,[...(groups.get(key)??[]),row]);}
 return [...groups.entries()].map(([key,group]):Peripheral=>{
  const generic=/(HID|USB Input Device|USB Composite|Périphérique|standard|conforme|compliant|Generic)/i;
  const score=(r:RawDevice)=>(generic.test(r.name)?0:20)+(generic.test(r.manufacturer)?0:5)+(r.className==='USB'?0:1);
  const meaningful=[...group].sort((a,b)=>score(b)-score(a))[0];
  const combined=group.map(r=>`${r.name} ${r.className} ${r.instanceId} ${r.parent}`).join(' ');
  const names=group.map(r=>r.name).join(' ');
  const receiver=/receiver|récepteur|dongle/i.test(names);
  const hasMouse=group.some(r=>r.className==='Mouse'),hasKeyboard=group.some(r=>r.className==='Keyboard');
  const category=/headset|casque/i.test(meaningful.name)?'headset':/gamepad|controller|manette/i.test(meaningful.name)?'controller':/mouse|souris/i.test(meaningful.name)&&!generic.test(meaningful.name)?'mouse':/keyboard|clavier|gaming\s*kb|\bkb\b|keyz/i.test(meaningful.name)&&!generic.test(meaningful.name)?'keyboard':hasMouse&&!hasKeyboard?'mouse':hasKeyboard&&!hasMouse?'keyboard':/AudioEndpoint|MEDIA/i.test(combined)?'audio':receiver?'receiver':'other';
  const connection=/BTHENUM|BTHLEDEVICE|BTHLE/i.test(combined)?'bluetooth':/2[.,]4\s*(ghz|g\b)/i.test(names)?'wireless_2_4g':receiver?'wireless_receiver':/USB\\/i.test(combined)?'usb':'unknown';
  const batteryRow=group.find(r=>r.battery!==null&&r.battery>=0&&r.battery<=100);
  const battery=percent(batteryRow?.battery??null,batteryRow?.batterySource??'Windows DeviceProperty / HID standard');
  if(battery.value===null){const failed=group.find(r=>r.batteryState==='permission_required')??group.find(r=>r.batteryState==='temporarily_unavailable'||r.batteryState==='error');if(failed?.batteryState)battery.state=failed.batteryState;}
  const ids=combined.match(/VID_([0-9A-F]{4}).*?PID_([0-9A-F]{4})/i);
  return {id:key,name:meaningful.name||'Périphérique',manufacturer:meaningful.manufacturer||'',category,connection,presence:receiver?'receiver_present':'connected',battery,lastSeen:Date.now(),vendorId:ids?.[1]?.toUpperCase()??null,productId:ids?.[2]?.toUpperCase()??null,instanceIds:group.map(r=>r.instanceId),interfaces:group.length,identification:'Nom déclaré par Windows ou le descripteur HID ; modèle commercial non certifié.'+(connection==='usb'?' Le bus USB ne distingue pas ici le câble d’un récepteur.':'')};
 });
}
