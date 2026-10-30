import { spawn } from 'node:child_process';
import { watch } from 'node:fs';
import { createRequire } from 'node:module';
import { once } from 'node:events';
const require=createRequire(import.meta.url);
const children=new Set();
function execute(executable,args){return new Promise((resolve,reject)=>{const child=spawn(executable,args,{stdio:'inherit',windowsHide:true});children.add(child);child.on('error',reject);child.on('exit',code=>{children.delete(child);code===0?resolve():reject(Error(`Commande terminée (${code}).`));});});}
await execute('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/build-native.ps1']);
await import('./build.mjs');
let electron;
let restarting=false;
let debounce;
function launch(){const child=spawn(require('electron'),['.','--dev'],{stdio:['inherit','inherit','inherit','ipc'],windowsHide:true});electron=child;children.add(child);child.on('exit',()=>{children.delete(child);if(child===electron&&!restarting)process.exit(0);});}
async function stopElectron(){if(!electron||electron.exitCode!==null)return;const child=electron;const exited=once(child,'exit');if(child.connected)child.send({command:'orbit:dev-quit'});else child.kill();const timeout=setTimeout(()=>child.kill(),3000);try{await exited;}finally{clearTimeout(timeout);}}
launch();
// Development still uses orbit://app. No HTTP server, even during development.
for(const directory of ['src','electron','shared','system'])watch(directory,{recursive:true},(_event,filename)=>{clearTimeout(debounce);debounce=setTimeout(async()=>{
 if(restarting)return;restarting=true;await stopElectron();
 try{if(filename?.endsWith('.cs'))await execute('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','Bypass','-File','scripts/build-native.ps1']);await execute(process.execPath,['scripts/build.mjs']);launch();}catch(error){console.error(error.message);}finally{restarting=false;}
},400);});
process.on('SIGINT',()=>{for(const child of children)child.kill();process.exit(0);});
