import { NativeBridge } from '../system/providers/bridge.ts';
import path from 'node:path';
import { setTimeout } from 'node:timers/promises';
const bridge=new NativeBridge(path.resolve('build/native/OrbitBridge.exe'));
try{
 await bridge.request('fast',{},15000);
 const before=await bridge.request('diagnostics');const time=performance.now();
 const nodeCpu=process.cpuUsage();
 for(let i=0;i<8;i++){await setTimeout(1000);await bridge.request('fast',{},10000);}
 const after=await bridge.request('diagnostics');const elapsed=performance.now()-time;
 const nodeDelta=process.cpuUsage(nodeCpu);
 console.log(JSON.stringify({scope:'Collecteur seul, pas Electron/React. Test court après chauffe, une mesure par seconde.',elapsedMs:Math.round(elapsed),collectorOneCoreCpuPercent:Math.round((after.cpuMilliseconds-before.cpuMilliseconds)/elapsed*10000)/100,collectorWorkingSetMiB:Math.round(after.workingSet/1024**2),nodeHarnessOneCoreCpuPercent:Math.round((nodeDelta.user+nodeDelta.system)/1000/elapsed*10000)/100},null,2));
}finally{bridge.stop();}
