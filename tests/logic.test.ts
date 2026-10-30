import test from 'node:test';
import assert from 'node:assert/strict';
import { cpuDelta, networkRates, percent, validateAudio, validatePreferences, effectiveInterval, groupDevices, rankSearch, type RawDevice } from '../shared/logic.ts';

test('CPU : vraie différence temporelle, 0 % réel et échantillon absent',()=>{
 assert.equal(cpuDelta([{times:{idle:100,user:0}}],[{times:{idle:150,user:50}}]).total,50);
 assert.equal(cpuDelta([{times:{idle:100,user:0}}],[{times:{idle:200,user:0}}]).total,0);
 assert.equal(cpuDelta([{times:{idle:100,user:0}}],[{times:{idle:100,user:0}}]).total,null);
 assert.equal(cpuDelta([{times:{idle:100,user:0}}],[{times:{idle:0,user:0}}]).total,null);
});
test('Métriques : une batterie absente est différente d’une batterie vide',()=>{
 assert.equal(percent(null,'test').value,null);assert.equal(percent(null,'test').state,'unsupported');
 assert.equal(percent(0,'test').value,0);assert.equal(percent(0,'test').state,'available');
 for(const v of [-1,101,NaN,Infinity,'50'])assert.equal(percent(v,'test').value,null);
});
test('Réseau : intervalle réel, changement d’interface et remise à zéro',()=>{
 const previous={timestamp:1000,adapters:[{id:'eth',received:100,sent:50}]};
 const current={timestamp:3000,adapters:[{id:'eth',name:'Ethernet',received:2100,sent:250}]};
 assert.equal(networkRates(previous,current)[0].download.value,1000);
 assert.equal(networkRates(previous,current)[0].upload.value,100);
 assert.equal(networkRates(null,current)[0].download.value,null);
 assert.equal(networkRates(previous,{...current,adapters:[{...current.adapters[0],id:'new'}]})[0].download.value,null);
 assert.equal(networkRates(previous,{...current,adapters:[{...current.adapters[0],received:1}]})[0].download.value,null);
 assert.equal(networkRates(previous,{...current,timestamp:1000})[0].download.value,null);
});
const row=(patch:Partial<RawDevice>):RawDevice=>({instanceId:'HID\\VID_1234&PID_5678\\A',container:'11111111-1111-1111-1111-111111111111',parent:'',name:'Souris HID',manufacturer:'Déclaré',className:'Mouse',battery:null,hardwareIds:'',status:'present',...patch});
test('Périphériques : regrouper les interfaces d’un conteneur, conserver deux produits de même nom',()=>{
 const a=row({}),b=row({instanceId:'HID\\VID_1234&PID_5678&COL02\\A',className:'HIDClass'}),c=row({instanceId:'HID\\VID_1234&PID_5678\\B',container:'22222222-2222-2222-2222-222222222222'});
 const grouped=groupDevices([a,b,c]);assert.equal(grouped.length,2);assert.equal(grouped[0].interfaces,2);assert.equal(grouped[0].battery.value,null);assert.equal(grouped[0].vendorId,'1234');assert.equal(grouped[0].productId,'5678');
});
test('Périphériques : conteneur absent, dongle et modèle générique ne justifient aucune invention',()=>{
 const grouped=groupDevices([row({container:'',instanceId:'USB\\VID_1234&PID_0001\\A',name:'USB receiver'}),row({container:'',instanceId:'USB\\VID_1234&PID_0001\\B',name:'USB receiver'})]);
 assert.equal(grouped.length,2);assert.equal(grouped[0].connection,'wireless_receiver');assert.equal(grouped[0].presence,'receiver_present');assert.equal(grouped[0].name,'USB receiver');assert.equal(grouped[0].battery.value,null);
 assert.equal(groupDevices([row({instanceId:'BTHLEDEVICE\\TEST'})])[0].connection,'bluetooth');
 const composite=[row({name:'Pulsar Mouse IR update',className:'Mouse'}),row({name:'Pulsar Mouse IR update',className:'Keyboard',instanceId:'HID\\SECOND'})];
 assert.equal(groupDevices(composite)[0].category,'mouse');
 assert.equal(groupDevices(composite.map(r=>({...r,name:'Gaming KB'})))[0].category,'keyboard');
});
test('Préférences et audio : rejet des types et chemins arbitraires',()=>{
 assert.deepEqual(validatePreferences({theme:'dark',interval:1000}),{theme:'dark',interval:1000});
 for(const p of [{interval:0},{theme:'remote'},{startAtLogin:'true'},{command:'rm'},{monitorNames:JSON.parse('{"__proto__":"x"}')},{devices:{bad:{name:'invalide'}}},{devices:{['a'.repeat(24)]:{image:'../../secret'}}}])assert.throws(()=>validatePreferences(p));
 for(const p of [{volume:-1},{volume:101},{volume:1.2},{muted:'true'},{command:'anything'},{},null])assert.throws(()=>validateAudio(p));
 assert.deepEqual(validateAudio({volume:0,muted:false}),{volume:0,muted:false});
});
test('Économie : 60 s en arrière-plan, aucune mesure en veille',()=>{
 assert.equal(effectiveInterval(1000,true,true,false),1000);assert.equal(effectiveInterval(1000,false,true,false),60000);assert.equal(effectiveInterval(3000,false,false,false),3000);assert.equal(effectiveInterval(1000,true,true,true),null);
});
test('Recherche : accents, données matérielles et pertinence',()=>{
 const data=[{id:'1',title:'Écrans',description:'Page',keywords:'moniteur'},{id:'2',title:'Carte RTX réelle',description:'GPU',keywords:'écran'}];
 assert.equal(rankSearch('ecran',data)[0].id,'1');assert.equal(rankSearch('RTX',data)[0].id,'2');assert.equal(rankSearch('inconnu',data).length,0);
});
