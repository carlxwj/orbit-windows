import os from 'node:os';
import { statfs } from 'node:fs/promises';
import path from 'node:path';
import type { AppEvent, Inventory, LiveSample, Preferences, AudioState } from '../shared/contracts.ts';
import { cpuDelta, effectiveInterval, metric, networkRates, percent } from '../shared/logic.ts';
import { NativeBridge } from './providers/bridge.ts';
import { normalizeInventory, normalizeGpus, object, list, num, text, type Raw } from './collectors/normalize.ts';

export class Monitor {
  inventory:Inventory|null=null;
  live:LiveSample|null=null;
  private previousCpu=os.cpus();
  private networkPrevious:{timestamp:number;adapters:{id:string;received:number;sent:number}[]}|null=null;
  private timer:ReturnType<typeof setTimeout>|null=null;
  private visible=true;
  private suspended=false;
  private stopped=false;
  private fastBusy=false;
  private inventoryBusy=false;
  private inventoryDirty=true;
  private lastInventoryAttempt=0;
  private outputs:AudioState['outputs']=[];
  private bridge:NativeBridge;
  private preferences:()=>Preferences;
  private emit:(event:AppEvent)=>void;
  private photo:(file:string)=>Promise<string|null>;
  constructor(bridge:NativeBridge,preferences:()=>Preferences,emit:(event:AppEvent)=>void,photo:(file:string)=>Promise<string|null>) {this.bridge=bridge;this.preferences=preferences;this.emit=emit;this.photo=photo;}
  start(visible=true){this.visible=visible;if(visible)void this.refresh();void this.sample();}
  async refresh(){
    if(this.inventoryBusy||this.stopped||this.suspended)return;
    this.inventoryBusy=true;this.inventoryDirty=false;this.lastInventoryAttempt=Date.now();
    try{
      if(!this.inventory){this.inventory=normalizeInventory({});this.emit({type:'inventory',data:this.inventory});}
      const raw=object(await this.bridge.request('inventory',{},60000));
      const inventory=normalizeInventory(raw);
      inventory.system.photo=await this.photo(text(object(raw.profile).photo));
      this.outputs=Array.isArray(object(raw.audio).outputs)?object(raw.audio).outputs as AudioState['outputs']:[];
      // Keep known disconnected devices so presence and unknown battery remain distinct.
      for(const old of this.inventory?.devices??[])if(!inventory.devices.some(d=>d.id===old.id))inventory.devices.push({...old,presence:'disconnected',battery:metric<number>(null,old.battery.source,'temporarily_unavailable','%')});
      if(!inventory.volumes.length){
        try{const root=path.parse(process.env.SystemRoot??'C:\\Windows').root;const fs=await statfs(root);inventory.volumes=[{id:root,label:'Disque système',total:fs.blocks*fs.bsize,free:fs.bavail*fs.bsize,filesystem:'',physicalId:null}];}catch{}
      }
      this.inventory=inventory;this.emit({type:'inventory',data:inventory});
    }catch{
      if(this.inventory)this.inventory={...this.inventory,issues:[...this.inventory.issues.filter(i=>i.collector!=='bridge'),{collector:'bridge',state:'temporarily_unavailable'}]};
      this.emit({type:'inventory',data:this.inventory});
    }finally{this.inventoryBusy=false;}
  }
  private async sample(){
    if(this.fastBusy||this.stopped)return;
    const interval=effectiveInterval(this.preferences().interval,this.visible,this.preferences().backgroundEco,this.suspended);
    if(interval===null)return;
    this.fastBusy=true;
    try{
      let raw:Raw={};let ok=false;
      try{raw=object(await this.bridge.request('fast',{},12000));ok=true;}catch{}
      const cpus=os.cpus(),delta=cpuDelta(this.previousCpu,cpus);this.previousCpu=cpus;
      const timestamp=Date.now(),total=os.totalmem(),free=os.freemem(),used=total-free,counters=object(raw.counters);
      const networkCurrent={timestamp,adapters:list(raw.network).map(a=>({id:text(a.id),name:text(a.name),received:num(a.received)??0,sent:num(a.sent)??0}))};
      const audio=object(raw.audio);
      const cpuSensor=list(raw.sensors).find(s=>s.SensorType==='Temperature'&&/CPU\s+Package|CPU\s+\(Tctl\/Tdie\)/i.test(text(s.Name)));
      const cpuTemperature=metric(cpuSensor?num(cpuSensor.Value):null,'LibreHardwareMonitor WMI',cpuSensor&&num(cpuSensor.Value)!==null?'available':'unsupported','°C');
      if(cpuSensor)cpuTemperature.updatedAt=num(raw.sensorTimestamp)??timestamp;
      const state:AudioState|null=typeof audio.volume==='number'?{volume:audio.volume,muted:audio.muted===true,name:text(audio.name),outputs:this.outputs}:null;
      this.live={timestamp,cpu:metric(delta.total,'Node/Windows CPU times',delta.total===null?'temporarily_unavailable':'available','%'),perCore:delta.cores,cpuMHz:metric(num(counters.cpuMHz),'PDH Processor Frequency',num(counters.cpuMHz)===null?'unsupported':'available','MHz'),cpuTemperature,memory:{total,free,used,percent:used/total*100},gpus:normalizeGpus(raw,this.inventory),network:networkRates(this.networkPrevious,networkCurrent),diskRead:metric(num(counters.diskRead),'PDH PhysicalDisk',num(counters.diskRead)===null?'unsupported':'available','B/s'),diskWrite:metric(num(counters.diskWrite),'PDH PhysicalDisk',num(counters.diskWrite)===null?'unsupported':'available','B/s'),diskActivity:percent(num(counters.diskIdle)===null?null:Math.max(0,Math.min(100,100-num(counters.diskIdle)!)),'PDH PhysicalDisk Idle'),audio:metric(state,'Windows Core Audio',state?'available':'temporarily_unavailable'),battery:percent(raw.battery,'GetSystemPowerStatus'),uptime:os.uptime(),collector:metric(ok?'Connecté':null,'OrbitBridge',ok?'available':'temporarily_unavailable')};
      this.networkPrevious=networkCurrent;this.emit({type:'live',data:this.live});
      if(this.visible&&(this.inventoryDirty||!this.inventory||timestamp-this.lastInventoryAttempt>300000))void this.refresh();
    }finally{
      this.fastBusy=false;
      const delay=effectiveInterval(this.preferences().interval,this.visible,this.preferences().backgroundEco,this.suspended);
      if(delay!==null&&!this.stopped)this.timer=setTimeout(()=>{void this.sample();},delay);
    }
  }
  async setAudio(patch:{volume?:number;muted?:boolean}):Promise<AudioState>{
    const audio=await this.bridge.request('audio',patch) as AudioState;
    this.outputs=audio.outputs;
    if(this.live){this.live={...this.live,audio:metric(audio,'Windows Core Audio')};this.emit({type:'live',data:this.live});}
    return audio;
  }
  changed(){this.inventoryDirty=true;if(this.visible)void this.refresh();}
  schedule(visible=this.visible,suspended=this.suspended){
    const waking=this.suspended&&!suspended;this.visible=visible;this.suspended=suspended;
    if(this.timer)clearTimeout(this.timer);this.timer=null;
    if(waking){this.previousCpu=os.cpus();this.networkPrevious=null;this.inventoryDirty=true;}
    if(!this.fastBusy&&!suspended)void this.sample();
  }
  stop(){this.stopped=true;if(this.timer)clearTimeout(this.timer);this.bridge.stop();}
}
