import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInventory, normalizeGpus } from '../system/collectors/normalize.ts';

test('Inventaire vide : aucune VRAM, température ou vitesse inventée',()=>{
 const result=normalizeInventory({video:[{Name:'GPU déclaré',AdapterRAM:4294967295}]});
 assert.equal(result.gpus[0].dedicated.value,null);assert.equal(result.cpu.nominalMHz.value,null);assert.equal(result.cpu.physical.value,null);assert.equal(result.cpu.physical.state,'unsupported');assert.equal(result.memory.length,0);assert.equal(result.board.chipset.value,null);assert.equal(result.system.accountType,'unknown');
});
test('RAM : capacité et débits DDR préservés, pas de latence estimée',()=>{
 const result=normalizeInventory({memory:[{DeviceLocator:'A2',Capacity:17179869184,SMBIOSMemoryType:26,Speed:3200,ConfiguredClockSpeed:3200},{DeviceLocator:'B2',Capacity:17179869184,SMBIOSMemoryType:26,Speed:3200,ConfiguredClockSpeed:3200}]});
 assert.equal(result.memory.length,2);assert.equal(result.memory.reduce((n,m)=>n+(m.capacity??0),0),34359738368);assert.equal(result.memory[0].configuredMTs.value,3200);assert.equal(result.memory[0].configuredMTs.unit,'MT/s');assert.equal(result.memory[0].type,'DDR4');assert.ok(!('cas'in result.memory[0]));
});
test('SMBIOS et topologie Win32 : repli réel si WMI échoue',()=>{
 const result=normalizeInventory({smbios:{cpu:{Name:'CPU firmware',NumberOfCores:8},memory:[{DeviceLocator:'A',Capacity:8589934592,SMBIOSMemoryType:34,Speed:5600,ConfiguredClockSpeed:5200,Source:'SMBIOS GetSystemFirmwareTable'}],board:{Product:'Carte firmware'},os:{Caption:'Windows 11',BuildNumber:'123.456'}}});
 assert.equal(result.cpu.physical.value,8);assert.equal(result.memory[0].configuredMTs.value,5200);assert.equal(result.board.model,'Carte firmware');assert.equal(result.system.os,'Windows 11');
});
test('Écrans : fréquence active 241 Hz et fréquence fractionnaire non arrondies',()=>{
 const result=normalizeInventory({displays:[{id:'1',name:'Moniteur',width:2560,height:1440,refresh:241,primary:true},{id:'2',name:'Second',width:1920,height:1080,refresh:60000/1001}]});
 assert.equal(result.displays[0].refresh.value,241);assert.equal(result.displays[1].refresh.value,60000/1001);assert.equal(result.displays[0].hdr.value,null);assert.equal(result.displays[0].nativeWidth.value,null);
});
test('Plusieurs GPU : corrélation LUID, moteur occupé et mémoire partagée distincte',()=>{
 const inv=normalizeInventory({gpu:[{id:'luid_A',name:'AMD GPU',dedicated:8*1024**3,vendor:4098},{id:'luid_B',name:'Intel GPU',dedicated:0,vendor:32902}]});
 const samples=normalizeGpus({counters:{gpuEngines:[{name:'pid_1_luid_A_phys_0_eng_0_engtype_3D',value:30},{name:'pid_2_luid_A_phys_0_eng_0_engtype_3D',value:20},{name:'pid_3_luid_A_phys_0_eng_1_engtype_Copy',value:10},{name:'pid_1_luid_B_phys_0_eng_0_engtype_3D',value:7}],gpuDedicated:[{name:'luid_A_phys_0',value:1024}],gpuShared:[{name:'luid_A_phys_0',value:2048}]}},inv);
 assert.equal(samples[0].load.value,50);assert.equal(samples[1].load.value,7);assert.equal(samples[0].used.value,1024);assert.equal(samples[0].shared.value,2048);assert.equal(samples[0].temperature.value,null);
});
test('Deux GPU NVIDIA de même nom : aucune correspondance ambiguë par le nom',()=>{
 const inv=normalizeInventory({gpu:[{id:'A',name:'GPU identique',dedicated:123},{id:'B',name:'GPU identique',dedicated:123}]});
 const samples=normalizeGpus({gpus:[{id:'NV0',name:'GPU identique',load:50,temperature:70},{id:'NV1',name:'GPU identique',load:20,temperature:45}]},inv);
 assert.equal(samples[0].temperature.value,null);assert.equal(samples[1].load.value,null);
});
test('Disques : aucun mélange volume/disque si association incertaine',()=>{
 const result=normalizeInventory({volumes:[{id:'C:\\',total:1000,free:500}],physicalDisks:[{DeviceId:'0',FriendlyName:'SSD',Size:1000,MediaType:4,BusType:17,HealthStatus:0}]});
 assert.equal(result.volumes[0].physicalId,null);assert.equal(result.disks[0].media,'SSD');assert.equal(result.disks[0].bus,'NVMe');assert.equal(result.disks[0].temperature.value,null);
});
