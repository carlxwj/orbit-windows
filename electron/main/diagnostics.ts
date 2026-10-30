import { appendFile, stat, writeFile, unlink } from 'node:fs/promises';
import type { Inventory } from '../../shared/contracts.ts';

/** Local, bounded provider states only. No message, name, SID, address or hardware ID. */
export class DiagnosticLog {
 private file:string;
 private queue:Promise<unknown>=Promise.resolve();
 private signature='';
 constructor(file:string){this.file=file;}
 record(issues:Inventory['issues']){
  const safe=issues.filter(i=>/^[a-zA-Z]{1,32}$/.test(i.collector)).map(i=>({provider:i.collector,state:i.state}));
  const signature=JSON.stringify(safe);if(signature===this.signature)return this.queue;this.signature=signature;
  this.queue=this.queue.catch(()=>{}).then(async()=>{
   const size=await stat(this.file).then(s=>s.size).catch(()=>0);
   if(size>256*1024)await writeFile(this.file,'','utf8');
   await appendFile(this.file,JSON.stringify({timestamp:Date.now(),providers:safe})+'\n','utf8');
  }).catch(()=>{});
  return this.queue;
 }
 async clear(){await this.queue;await unlink(this.file).catch(()=>{});this.signature='';}
}
