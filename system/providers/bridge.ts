import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';

/** A single, hidden .NET process. Requests may finish out of order. No shell. */
export class NativeBridge {
  private child:ChildProcessWithoutNullStreams|null = null;
  private sequence = 0;
  private pending = new Map<number,{resolve:(value:unknown)=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>();
  private stopped = false;
  private restartAt = 0;
  private readonly executable:string;
  constructor(executable:string) {this.executable=executable;}
  private start() {
    if(this.child) return;
    if(this.stopped || Date.now()<this.restartAt) throw Error('Collecteur indisponible.');
    const child=spawn(this.executable,[],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    this.child=child;
    const lines=createInterface({input:child.stdout});
    lines.on('line',line=>{
      if(line.length>4*1024*1024) return;
      try {
        const message=JSON.parse(line) as {id:number;ok:boolean;data:unknown;error:string};
        const task=this.pending.get(message.id);if(!task) return;
        this.pending.delete(message.id);clearTimeout(task.timer);
        if(message.ok) task.resolve(message.data);else task.reject(Error(message.error));
      } catch { /* A malformed response cannot execute anything. */ }
    });
    child.stderr.resume();
    const failed=()=>{
      if(this.child!==child)return;
      this.child=null;this.restartAt=Date.now()+10000;lines.close();
      for(const task of this.pending.values()){clearTimeout(task.timer);task.reject(Error('Collecteur interrompu.'));}this.pending.clear();
    };
    child.on('error',failed);child.on('exit',failed);child.stdin.on('error',failed);
  }
  request(command:'fast'|'inventory'|'audio'|'ping'|'diagnostics',args:Record<string,unknown>={},timeout=5000):Promise<unknown> {
    try {this.start();}catch(error){return Promise.reject(error);}
    if(this.pending.size>=6)return Promise.reject(Error('Collecteur occupé.'));
    return new Promise((resolve,reject)=>{
      const id=++this.sequence;
      const timer=setTimeout(()=>{
        this.pending.delete(id);reject(Error('Délai du collecteur dépassé.'));
        // Terminate native work as well, so timeouts cannot accumulate background tasks.
        this.child?.kill();
      },timeout);
      this.pending.set(id,{resolve,reject,timer});
      this.child!.stdin.write(JSON.stringify({...args,id,command})+'\n');
    });
  }
  stop(){this.stopped=true;this.child?.stdin.end();this.child?.kill();for(const task of this.pending.values()){clearTimeout(task.timer);task.reject(Error('Arrêt du collecteur.'));}this.pending.clear();this.child=null;}
}
