import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { assertAppFrame, rendererFile } from '../shared/security.ts';
test('IPC : origine, fenêtre propriétaire et frame principale obligatoires',()=>{
 assert.doesNotThrow(()=>assertAppFrame('orbit://app/',true,true));
 for(const url of ['https://example.com/','file:///C:/index.html','orbit://evil/','orbit://app.evil/','orbit://user@app/','orbit://app:80/','orbit://app/assets/script.js','orbit://app/?remote=true'])assert.throws(()=>assertAppFrame(url,true,true));
 assert.throws(()=>assertAppFrame('orbit://app/',false,true));assert.throws(()=>assertAppFrame('orbit://app/',true,false));
});
test('Protocole : aucun chemin libre, contenu distant ou extension exécutable',()=>{
 const directory=path.resolve('dist-renderer');
 assert.equal(rendererFile(directory,'orbit://app/'),path.join(directory,'index.html'));
 assert.equal(rendererFile(directory,'orbit://app/assets/app.js'),path.join(directory,'assets','app.js'));
 for(const url of ['https://app/index.html','orbit://evil/index.html','orbit://app/package.json','orbit://app/secret.exe','orbit://app/%00.js','orbit://app/%5c..%5csecret.js','orbit://app/%2e%2e%2fsecret.js','orbit://app/%xx'])assert.equal(rendererFile(directory,url),null);
});
