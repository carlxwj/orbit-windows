import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { FocusTimer } from '../shared/focus.ts';
import { PreferenceStore } from '../electron/main/persistence.ts';

test('Concentration : pause/reprise, expiration après veille et fin unique',()=>{
 const timer=new FocusTimer();timer.command('duration',25,1000);timer.command('start',undefined,1000);
 timer.tick(11000);assert.equal(timer.state.remaining,1490);timer.command('pause',undefined,11000);timer.tick(900000);assert.equal(timer.state.remaining,1490);
 timer.command('start',undefined,900000);assert.equal(timer.tick(3000000,true),true);assert.equal(timer.state.completed,1);assert.equal(timer.state.history.length,1);assert.equal(timer.tick(3000001,true),false);
 timer.command('reset');assert.equal(timer.state.remaining,1500);assert.throws(()=>timer.command('duration',0));assert.throws(()=>timer.command('duration',181));
});
test('Préférences : écritures sérialisées, relecture et fichier invalide',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'orbit-test-'));
 try{
  const store=new PreferenceStore(directory);await store.load();assert.equal(store.value.startAtLogin,false);assert.equal(store.value.closeToTray,false);
  await Promise.all([store.update({theme:'dark'}),store.update({interval:5000})]);
  const another=new PreferenceStore(directory);await another.load();assert.equal(another.value.theme,'dark');assert.equal(another.value.interval,5000);
  assert.equal(JSON.parse(await readFile(path.join(directory,'preferences.json'),'utf8')).interval,5000);
  await writeFile(path.join(directory,'preferences.json'),'{broken');await another.load();assert.equal(another.value.startAtLogin,false);assert.equal(another.value.theme,'system');
 }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'orbit-test-'));await rm(directory,{recursive:true,force:true});}
});
