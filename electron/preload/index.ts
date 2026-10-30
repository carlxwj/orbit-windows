import { contextBridge, ipcRenderer } from 'electron';
import type { OrbitAPI, AppEvent } from '../../shared/contracts.ts';
const api:OrbitAPI={
 bootstrap:()=>ipcRenderer.invoke('orbit:bootstrap'),
 subscribe:(callback)=>{const listener=(_event:Electron.IpcRendererEvent,value:AppEvent)=>callback(value);ipcRenderer.on('orbit:event',listener);return()=>ipcRenderer.removeListener('orbit:event',listener);},
 preferences:patch=>ipcRenderer.invoke('orbit:preferences',patch),window:action=>ipcRenderer.invoke('orbit:window',action),
 openSettings:target=>ipcRenderer.invoke('orbit:settings',target),openVolume:id=>ipcRenderer.invoke('orbit:volume',id),
 audio:patch=>ipcRenderer.invoke('orbit:audio',patch),refresh:()=>ipcRenderer.invoke('orbit:refresh'),
 focus:(action,minutes)=>ipcRenderer.invoke('orbit:focus',action,minutes),
 image:target=>ipcRenderer.invoke('orbit:image',target),removeAvatar:()=>ipcRenderer.invoke('orbit:remove-avatar'),reset:()=>ipcRenderer.invoke('orbit:reset')
};
contextBridge.exposeInMainWorld('orbit',Object.freeze(api));
