import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import path from 'node:path';
import { defaults, validatePreferences } from '../../shared/logic.ts';
import type { Preferences } from '../../shared/contracts.ts';

export class PreferenceStore {
 value:Preferences=structuredClone(defaults);
 private queue:Promise<unknown>=Promise.resolve();
 readonly directory:string;
 constructor(directory:string){this.directory=directory;}
 async load(){
  try{this.value={...structuredClone(defaults),...validatePreferences(JSON.parse(await readFile(path.join(this.directory,'preferences.json'),'utf8')))};}catch{this.value=structuredClone(defaults);}
  return this.value;
 }
 async update(patch:unknown){
  const valid=validatePreferences(patch);
  this.value={...this.value,...valid};
  const data=JSON.stringify(this.value,null,2);
  const task=this.queue.catch(()=>{}).then(async()=>{await mkdir(this.directory,{recursive:true});const tmp=path.join(this.directory,'preferences.tmp');await writeFile(tmp,data,'utf8');await rename(tmp,path.join(this.directory,'preferences.json'));});
  this.queue=task;await task;return this.value;
 }
}
