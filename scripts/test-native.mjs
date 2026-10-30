import assert from 'node:assert/strict';
import { NativeBridge } from '../system/providers/bridge.ts';
import path from 'node:path';
import { normalizeInventory } from '../system/collectors/normalize.ts';
const bridge=new NativeBridge(path.resolve('build/native/OrbitBridge.exe'));
try{
 const ping=await bridge.request('ping');assert.equal(ping.version,'2.0.0');console.log('PASS : protocole du collecteur natif.');
 const result=await bridge.request('fast',{},15000);
 assert.equal(typeof result.timestamp,'number');
 if(result.audio){assert.ok(result.audio.volume>=0&&result.audio.volume<=100);assert.equal(typeof result.audio.muted,'boolean');console.log('PASS : lecture réelle du volume, sans modification.');}
 else console.log('INDISPONIBLE : audio non exposé à cette session.');
 if(result.network){assert.ok(Array.isArray(result.network));console.log(`PASS : ${result.network.length} interface(s) réseau accessible(s).`);}
 console.log(`INFO : ${result.gpus?.length??0} GPU NVML accessible(s).`);
 const inventory=await bridge.request('inventory',{},65000);
 assert.ok(Array.isArray(inventory.devices)||inventory.devices===null);assert.ok(Array.isArray(inventory.displays)||inventory.displays===null);
 console.log(`PASS : inventaire partiel isolé ; ${inventory.issues.length} fournisseur(s) indisponible(s), ${inventory.devices?.length??0} interfaces PnP, ${inventory.displays?.length??0} écran(s).`);
 // Never log names, SID, device instance IDs, photos or local network addresses.
 console.log(JSON.stringify({collectors:Object.fromEntries(Object.entries(inventory).filter(([k])=>k!=='issues').map(([k,v])=>[k,v===null?'unavailable':Array.isArray(v)?`${v.length} entries`:'available']))}));
 const normalized=normalizeInventory(inventory);
 console.log(JSON.stringify({actual:{physicalCores:normalized.cpu.physical.value,memoryModules:normalized.memory.length,configuredMTs:normalized.memory.map(m=>m.configuredMTs.value),displayRefreshHz:normalized.displays.map(d=>d.refresh.value),groupedDevices:normalized.devices.length}}));
 if(result.audio){const audio=await bridge.request('audio',{});assert.ok(Array.isArray(audio.outputs));console.log(`PASS : ${audio.outputs.length} sortie(s) audio réelle(s), aucune sélection ni changement de volume.`);}
 else console.log('INDISPONIBLE : inventaire audio non vérifiable dans cette session.');
}finally{bridge.stop();}
