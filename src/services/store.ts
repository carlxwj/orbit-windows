import { useSyncExternalStore } from 'react';
import type { Bootstrap, Inventory, LiveSample, FocusState, Preferences, AppEvent } from '../../shared/contracts.ts';
import { defaults } from '../../shared/logic.ts';
import { FocusTimer } from '../../shared/focus.ts';
type Listener=()=>void;
function atom<T>(initial:T){let value=initial;const listeners=new Set<Listener>();return {get:()=>value,set:(next:T)=>{value=next;listeners.forEach(fn=>fn());},subscribe:(fn:Listener)=>{listeners.add(fn);return()=>{listeners.delete(fn);};}};}
export const prefsStore=atom<Preferences>(structuredClone(defaults));
export const inventoryStore=atom<Inventory|null>(null);
export const liveStore=atom<LiveSample|null>(null);
export const historyStore=atom<LiveSample[]>([]);
export const focusStore=atom<FocusState>(new FocusTimer().state);
export const uiStore=atom({dark:false,maximized:false,customAvatar:null as string|null,deviceImages:{} as Record<string,string>,ready:false,error:null as string|null});
export const toastStore=atom('');
export function usePrefs(){return useSyncExternalStore(prefsStore.subscribe,prefsStore.get);}
export function useInventory(){return useSyncExternalStore(inventoryStore.subscribe,inventoryStore.get);}
export function useLive(){return useSyncExternalStore(liveStore.subscribe,liveStore.get);}
export function useHistory(){return useSyncExternalStore(historyStore.subscribe,historyStore.get);}
export function useFocus(){return useSyncExternalStore(focusStore.subscribe,focusStore.get);}
export function useUI(){return useSyncExternalStore(uiStore.subscribe,uiStore.get);}
let toastTimer:ReturnType<typeof setTimeout>;
export function notify(message:string){clearTimeout(toastTimer);toastStore.set(message);toastTimer=setTimeout(()=>toastStore.set(''),4500);}
export async function run<T>(promise:Promise<T>):Promise<T|undefined>{try{return await promise;}catch(error){notify(error instanceof Error?error.message:'Cette action n’a pas pu aboutir.');return undefined;}}
function event(message:AppEvent){
 if(message.type==='preferences')prefsStore.set(message.data as Preferences);
 else if(message.type==='inventory')inventoryStore.set(message.data as Inventory);
 else if(message.type==='live'){
  const value=message.data as LiveSample;liveStore.set(value);
  const previous=historyStore.get(),last=previous.at(-1);
  // Audio actions also emit a live state; never insert duplicate measurement timestamps.
  if(!last||last.timestamp!==value.timestamp)historyStore.set([...previous.slice(-179),value]);
 }
 else if(message.type==='focus')focusStore.set(message.data as FocusState);
 else if(message.type==='theme')uiStore.set({...uiStore.get(),dark:message.data as boolean});
 else if(message.type==='window')uiStore.set({...uiStore.get(),maximized:message.data as boolean});
 else if(message.type==='image'){
  const image=message.data as {target:string;data:string|null};const ui=uiStore.get();
  uiStore.set(image.target==='avatar'?{...ui,customAvatar:image.data}:{...ui,deviceImages:{...ui.deviceImages,[image.target]:image.data??''}});
 }
}
export async function initialize(){
 if(!window.orbit){uiStore.set({...uiStore.get(),error:'Le pont Windows est absent. Ouvrez Orbit avec Electron, puis consultez le guide de compilation.',ready:true});return;}
 let ready=false;const buffered:AppEvent[]=[];
 const unsubscribe=window.orbit.subscribe(message=>{if(ready)event(message);else buffered.push(message);});
 try{
  const data:Bootstrap=await window.orbit.bootstrap();
  prefsStore.set(data.preferences);inventoryStore.set(data.inventory);liveStore.set(data.live);focusStore.set(data.focus);historyStore.set(data.history);
  uiStore.set({dark:data.dark,maximized:data.maximized,customAvatar:data.customAvatar,deviceImages:data.deviceImages,ready:true,error:null});
  ready=true;buffered.forEach(event);
 }catch(error){ready=true;uiStore.set({...uiStore.get(),ready:true,error:String(error)});}
 return unsubscribe;
}
export const navigate=(page:Preferences['page'])=>{void run(window.orbit.preferences({page}));};
export const setPreference=(patch:Partial<Preferences>)=>run(window.orbit.preferences(patch));
