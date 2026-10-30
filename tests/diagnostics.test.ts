import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { DiagnosticLog } from '../electron/main/diagnostics.ts';
test('Journal local : états expurgés, aucune identité ou adresse copiée',async()=>{
 const directory=await mkdtemp(path.join(tmpdir(),'orbit-test-'));
 try{
  const logger=new DiagnosticLog(path.join(directory,'diagnostics.log'));
  const issues=[{collector:'cpu',state:'permission_required' as const,username:'NE_PAS_COPIER',address:'192.0.2.10'}];
  await logger.record(issues);await logger.record(issues);
  const content=await readFile(path.join(directory,'diagnostics.log'),'utf8');
  assert.equal(content.trim().split('\n').length,1);assert.ok(!content.includes('NE_PAS_COPIER'));assert.ok(!content.includes('192.0.2.10'));assert.equal(JSON.parse(content).providers[0].state,'permission_required');
  await logger.clear();await assert.rejects(readFile(path.join(directory,'diagnostics.log')));
 }finally{assert.ok(path.resolve(directory).startsWith(path.resolve(tmpdir())+path.sep+'orbit-test-'));await rm(directory,{recursive:true,force:true});}
});
