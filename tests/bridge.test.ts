import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { NativeBridge } from '../system/providers/bridge.ts';
import { Monitor } from '../system/monitor.ts';
import { defaults } from '../shared/logic.ts';
import type { AppEvent,LiveSample } from '../shared/contracts.ts';

test('Collecteur manquant : rejet borné, aucun processus orphelin',async()=>{
 const bridge=new NativeBridge(path.resolve('tests/does-not-exist.exe'));
 try{await assert.rejects(bridge.request('ping',{},1000));await assert.rejects(bridge.request('ping',{},1000));}finally{bridge.stop();}
});
test('Échec natif isolé : CPU et RAM restent disponibles',async()=>{
 const bridge=new NativeBridge(path.resolve('tests/does-not-exist.exe'));
 const events:AppEvent[]=[];
 await new Promise<void>((resolve,reject)=>{
  const timer=setTimeout(()=>{monitor.stop();reject(Error('Aucune mesure de repli.'));},2500);
  const monitor=new Monitor(bridge,()=>structuredClone(defaults),event=>{events.push(event);if(event.type==='live'){monitor.stop();clearTimeout(timer);resolve();}},async()=>null);
  monitor.start(false);
 });
 const sample=events.find(e=>e.type==='live')?.data as LiveSample;
 assert.ok(sample.memory.total>0);assert.equal(sample.collector.state,'temporarily_unavailable');assert.equal(sample.audio.value,null);
 assert.equal(events.some(e=>e.type==='inventory'),false,'Le lancement masqué ne doit pas lancer l’inventaire lourd.');
});
