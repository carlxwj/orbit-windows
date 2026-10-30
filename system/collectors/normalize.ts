import os from 'node:os';
import { createHash } from 'node:crypto';
import type { Inventory, Metric, GpuInfo, GpuSample } from '../../shared/contracts.ts';
import { groupDevices, metric, percent, type RawDevice } from '../../shared/logic.ts';

export type Raw=Record<string,unknown>;
export const object=(v:unknown):Raw=>v&&typeof v==='object'&&!Array.isArray(v)?v as Raw:{};
export const list=(v:unknown):Raw[]=>Array.isArray(v)?v.map(object):[];
export const text=(v:unknown):string=>typeof v==='string'?v.trim():'';
export const num=(v:unknown):number|null=>typeof v==='number'&&Number.isFinite(v)?v:typeof v==='string'&&v.trim()!==''&&Number.isFinite(Number(v))?Number(v):null;
const positive=(v:unknown)=>{const n=num(v);return n!==null&&n>0?n:null;};
const wm=(v:unknown,unit?:string)=>metric(positive(v),'WMI',positive(v)===null?'unsupported':'available',unit);
function maybe<T>(value:T|null,source:string,unit?:string):Metric<T>{return metric(value,source,value===null?'unsupported':'available',unit);}
const first=(v:unknown)=>list(v)[0]??{};
function date(v:unknown){const s=text(v);return /^\d{14}/.test(s)?`${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`:s;}

export function normalizeInventory(value:unknown):Inventory{
 const raw=object(value),smbios=object(raw.smbios),cpu={...object(smbios.cpu),...first(raw.cpu)},board={...object(smbios.board),...first(raw.board)},bios={...object(smbios.bios),...first(raw.bios)},operating={...object(smbios.os),...first(raw.os)},profile=object(raw.profile),firmware=object(raw.firmware),computer=first(raw.computer);
 let username=process.env.USERNAME??'Utilisateur';try{username=os.userInfo().username;}catch{}
 const video=list(list(raw.video).length?raw.video:raw.videoFallback);
 const gpus:GpuInfo[]=list(raw.gpu).map(g=>{
  const matches=video.filter(v=>text(v.Name)===text(g.name));const driver=matches.length===1?matches[0]:{};
  return {id:text(g.id),name:text(g.name),vendor:g.vendor===4318?'NVIDIA':g.vendor===4098?'AMD':g.vendor===32902?'Intel':`PCI ${g.vendor}`,driver:text(driver.DriverVersion),driverDate:date(driver.DriverDate),dedicated:maybe(num(g.dedicated),'DXGI AdapterDesc1','B'),hardwareId:text(driver.PNPDeviceID)};
 });
 if(!gpus.length)video.forEach((g,i)=>gpus.push({id:text(g.PNPDeviceID)||String(i),name:text(g.Name),vendor:text(g.AdapterCompatibility),driver:text(g.DriverVersion),driverDate:date(g.DriverDate),dedicated:maybe<number>(null,'VRAM non exposée par DXGI','B'),hardwareId:text(g.PNPDeviceID)}));
 const rawDevices:RawDevice[]=list(raw.devices).map((d):RawDevice=>({instanceId:text(d.instanceId),container:text(d.container),parent:text(d.parent),name:text(d.name),manufacturer:text(d.manufacturer),className:text(d.className),battery:num(d.battery),batterySource:text(d.batterySource),batteryState:d.batteryState==='permission_required'?'permission_required':d.batteryState==='temporarily_unavailable'?'temporarily_unavailable':'unsupported',hardwareIds:text(d.hardwareIds),status:text(d.status)}));
 const devices=groupDevices(rawDevices).map(d=>({...d,id:createHash('sha256').update(d.id).digest('hex').slice(0,24)}));
 const volumes=list(raw.volumes).map(v=>({id:text(v.id),label:text(v.label),total:num(v.total)??0,free:num(v.free)??0,filesystem:text(v.filesystem),physicalId:null as string|null})).filter(v=>v.total>0);
 const nativeStorage=object(raw.nativeStorage);
 const physical=list(list(raw.physicalDisks).length?raw.physicalDisks:nativeStorage.disks),diskMap=list(list(raw.diskMap).length?raw.diskMap:nativeStorage.diskMap),partitions=list(list(raw.partitions).length?raw.partitions:nativeStorage.partitions);
 const disks=physical.map(d=>{
  const id=text(d.DeviceId)||String(d.DeviceId??'');
  const map=diskMap.filter(m=>text(m.FriendlyName)===text(d.FriendlyName)&&num(m.Size)===num(d.Size));
  const letters=map.length===1?partitions.filter(p=>num(p.DiskNumber)===num(map[0].Number)).map(p=>typeof p.DriveLetter==='number'?String.fromCharCode(p.DriveLetter):text(p.DriveLetter)).filter(x=>/^[A-Za-z]$/.test(x)).map(x=>x.toUpperCase()+':\\'):[];
  const mediaCode=num(d.MediaType),busCode=num(d.BusType),health=num(d.HealthStatus);
  return {id,model:text(d.FriendlyName),manufacturer:text(d.Manufacturer),capacity:num(d.Size),bus:({7:'USB',11:'SATA',17:'NVMe',8:'RAID',10:'SAS'} as Record<number,string>)[busCode??0]??'Non disponible',media:mediaCode===4?'SSD':mediaCode===3?'HDD':'Non disponible',health:maybe(health===0?'Sain':health===1?'Avertissement':health===2?'Défaillant':text(d.healthText)||null,health!==null?'MSFT_PhysicalDisk':'IOCTL_STORAGE_PREDICT_FAILURE'),temperature:maybe<number>(null,'SMART/NVMe non exposé','°C'),volumes:letters};
 });
 for(const volume of volumes){const related=disks.filter(d=>d.volumes.includes(volume.id.toUpperCase()));if(related.length===1)volume.physicalId=related[0].id;}
 const wifi=object(raw.wifi);
 return {timestamp:Date.now(),cpu:{model:text(cpu.Name)||os.cpus()[0]?.model||'Non disponible',manufacturer:text(cpu.Manufacturer),architecture:os.arch(),logical:os.cpus().length,physical:maybe(positive(cpu.NumberOfCores),text(cpu.Source)||'WMI'),nominalMHz:maybe<number>(null,'Fréquence de base non certifiée','MHz'),maxMHz:wm(cpu.MaxClockSpeed,'MHz'),l2KiB:wm(cpu.L2CacheSize,'KiB'),l3KiB:wm(cpu.L3CacheSize,'KiB')},gpus,
  memory:list(list(raw.memory).length?raw.memory:smbios.memory).map(m=>({slot:text(m.DeviceLocator),capacity:num(m.Capacity),manufacturer:text(m.Manufacturer),part:text(m.PartNumber),type:({24:'DDR3',26:'DDR4',34:'DDR5',30:'LPDDR4',35:'LPDDR5'} as Record<number,string>)[num(m.SMBIOSMemoryType)??0]??'Non disponible',ratedMTs:maybe(positive(m.Speed),text(m.Source)||'SMBIOS via WMI','MT/s'),configuredMTs:maybe(positive(m.ConfiguredClockSpeed),text(m.Source)||'SMBIOS via WMI','MT/s')})),
  system:{hostname:os.hostname(),username,displayName:text(profile.displayName)||username,os:text(operating.Caption)||`Windows ${os.release()}`,edition:text(operating.Caption),build:text(operating.BuildNumber)||os.version(),architecture:text(operating.OSArchitecture)||os.arch(),machineType:[text(computer.Manufacturer),text(computer.Model)].filter(Boolean).join(' · '),bootTime:Date.now()-os.uptime()*1000,accountType:text(profile.accountType)||'unknown',photo:null},
  board:{manufacturer:text(board.Manufacturer),model:text(board.Product),revision:text(board.Version),bios:text(bios.SMBIOSBIOSVersion),biosDate:date(bios.ReleaseDate),uefi:maybe(typeof firmware.uefi==='boolean'?firmware.uefi:null,'GetFirmwareType'),secureBoot:maybe(typeof firmware.secureBoot==='boolean'?firmware.secureBoot:null,'SecureBoot/State'),tpm:maybe(text(first(raw.tpm).SpecVersion)||null,'Win32_Tpm'),chipset:maybe<string>(null,'Non exposé')},volumes,disks,devices,
  displays:list(raw.displays).map(d=>({id:text(d.id),name:text(d.name),manufacturer:text(d.manufacturer),deviceName:text(d.deviceName),primary:d.primary===true,x:num(d.x)??0,y:num(d.y)??0,width:num(d.width)??0,height:num(d.height)??0,refresh:maybe(num(d.refresh),'QueryDisplayConfig/vSync','Hz'),scale:maybe(num(d.scale),'GetScaleFactorForMonitor','%'),orientation:text(d.orientation),connection:text(d.connection),nativeWidth:maybe(num(d.nativeWidth),'EDID preferred timing'),nativeHeight:maybe(num(d.nativeHeight),'EDID preferred timing'),widthCm:maybe(num(d.widthCm),'EDID','cm'),heightCm:maybe(num(d.heightCm),'EDID','cm'),hdr:maybe(typeof d.hdr==='boolean'?d.hdr:null,'DisplayConfig advanced color'),hdrSupported:maybe(typeof d.hdrSupported==='boolean'?d.hdrSupported:null,'DisplayConfig advanced color'),bits:maybe(num(d.bits),'DisplayConfig advanced color','bits'),modes:Array.isArray(d.modes)?d.modes.map(String):[],edid:text(d.edid)})),
  adapters:list(raw.network).map(n=>({id:text(n.id),name:text(n.name),type:text(n.type),status:text(n.status),speed:num(n.speed)??0,ipv4:Array.isArray(n.ipv4)?n.ipv4.map(String):[]})),
  wifi:maybe(wifi.ssid?{ssid:text(wifi.ssid),signal:num(wifi.signal)??0,rx:num(wifi.rx)??0,tx:num(wifi.tx)??0,band:text(wifi.band)}:null,'WLAN API'),
  bluetooth:{present:rawDevices.some(d=>d.className==='Bluetooth'),radio:maybe<boolean>(null,'État radio non exposé')},
  vpn:maybe(Array.isArray(raw.vpnFallback)?list(raw.vpnFallback).map(v=>({name:text(v.Name),connected:typeof v.Connected==='boolean'?v.Connected:null})):Array.isArray(raw.vpn)?list(raw.vpn).map(v=>({name:text(v.Name),connected:v.ConnectionStatus==='Connected'})):null,'RAS / profils VPN Windows'),
  sensors:list(raw.sensors).filter(s=>['Temperature','Fan'].includes(text(s.SensorType))&&num(s.Value)!==null).map(s=>({name:text(s.Name),type:text(s.SensorType),value:num(s.Value)!,unit:s.SensorType==='Fan'?'RPM':'°C',source:'LibreHardwareMonitor WMI (déjà installé)'})),
  issues:list(raw.issues).map((i):Inventory['issues'][number]=>({collector:text(i.collector),state:i.state==='permission_required'?'permission_required':'temporarily_unavailable'}))
 };
}

export function normalizeGpus(raw:Raw,inventory:Inventory|null):GpuSample[]{
 const nvml=list(raw.gpus),counters=object(raw.counters),dedicated=list(counters.gpuDedicated),shared=list(counters.gpuShared),engines=list(counters.gpuEngines);
 const adapters=inventory?.gpus.length?inventory.gpus:nvml.map(n=>({id:text(n.id),name:text(n.name)}));
 return adapters.map(g=>{
  const matches=nvml.filter(n=>text(n.name)===g.name),sameModel=adapters.filter(n=>n.name===g.name).length;const n=matches.length===1&&sameModel===1?matches[0]:{};
  const findMem=(rows:Raw[])=>{const match=rows.filter(r=>text(r.name).includes(g.id));return match.length===1?num(match[0].value):null;};
  const group=new Map<string,number>();for(const entry of engines){const name=text(entry.name);if(!name.includes(g.id))continue;const key=name.replace(/^pid_\d+_/,'');group.set(key,(group.get(key)??0)+(num(entry.value)??0));}
  const load=num(n.load)??(group.size?Math.min(100,Math.max(...group.values())):null);
  const nv=(key:string,unit:string)=>maybe(num(n[key]),'NVML',unit);
  return {id:g.id,name:g.name,load:percent(load,num(n.load)!==null?'NVML':'PDH · moteur le plus occupé'),used:maybe(num(n.used)??findMem(dedicated),num(n.used)!==null?'NVML':'PDH GPU Adapter Memory','B'),total:maybe(num(n.total)??('dedicated'in g?(g.dedicated as Metric<number>).value:null),'DXGI/NVML','B'),temperature:nv('temperature','°C'),clock:nv('clock','MHz'),memoryClock:nv('memoryClock','MHz'),power:nv('power','W'),fan:nv('fan','%'),shared:maybe(findMem(shared),'PDH GPU Adapter Memory','B')};
 });
}
