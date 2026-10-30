import { app, BrowserWindow, Menu, Tray, ipcMain, protocol, net, shell, nativeTheme, nativeImage, dialog, powerMonitor, screen, Notification, session } from 'electron';
import { readFile, writeFile, mkdir, unlink, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import type { IpcMainInvokeEvent } from 'electron';
import type { AppEvent, Bootstrap, SettingsTarget, LiveSample } from '../../shared/contracts.ts';
import { validateAudio, validatePreferences, defaults } from '../../shared/logic.ts';
import { FocusTimer } from '../../shared/focus.ts';
import { assertAppFrame, rendererFile } from '../../shared/security.ts';
import { NativeBridge } from '../../system/providers/bridge.ts';
import { Monitor } from '../../system/monitor.ts';
import { PreferenceStore } from './persistence.ts';
import { DiagnosticLog } from './diagnostics.ts';

protocol.registerSchemesAsPrivileged([{scheme:'orbit',privileges:{standard:true,secure:true,supportFetchAPI:true}}]);
const testDirectory=process.env.ORBIT_TEST_DATA;
if(!app.isPackaged&&testDirectory&&path.resolve(testDirectory).startsWith(path.resolve(tmpdir())+path.sep+'orbit-e2e-'))app.setPath('userData',testDirectory);
const settings:Record<SettingsTarget,string>={wifi:'ms-settings:network-wifi',bluetooth:'ms-settings:bluetooth',vpn:'ms-settings:network-vpn',airplane:'ms-settings:network-airplanemode',sound:'ms-settings:sound',display:'ms-settings:display',graphics:'ms-settings:display-advancedgraphics',hdr:'ms-settings:display',advancedDisplay:'ms-settings:display-advanced',storage:'ms-settings:storagesense',cleanup:'ms-settings:storagepolicies',account:'ms-settings:yourinfo',accounts:'ms-settings:emailandaccounts',security:'windowsdefender:',updates:'ms-settings:windowsupdate',notifications:'ms-settings:notifications',power:'ms-settings:powersleep',network:'ms-settings:network-status',focus:'ms-settings:quiethours',accessibility:'ms-settings:easeofaccess',personalization:'ms-settings:personalization'};
let win:BrowserWindow|null=null, tray:Tray|null=null, quitting=false;
let monitor:Monitor;
let focusTimeout:ReturnType<typeof setTimeout>|null=null;
let hotplugTimeout:ReturnType<typeof setTimeout>|null=null;
let boundsTimeout:ReturnType<typeof setTimeout>|null=null;
let lastRefresh=0;
const focus=new FocusTimer();
const userDirectory=app.getPath('userData');
const preferences=new PreferenceStore(userDirectory);
const diagnostics=new DiagnosticLog(path.join(userDirectory,'diagnostics.log'));
const mediaDirectory=path.join(userDirectory,'media');
const rendererDirectory=path.join(app.getAppPath(),'dist-renderer');
const resourceRoot=app.isPackaged?process.resourcesPath:app.getAppPath();
const nativeFile=app.isPackaged?path.join(resourceRoot,'native','OrbitBridge.exe'):path.join(resourceRoot,'build','native','OrbitBridge.exe');
const icon=path.join(resourceRoot,'assets','orbit.ico');
const deviceImages:Record<string,string>={};
let customAvatar:string|null=null;
let retainedHistory:LiveSample[]=[];
let lastHistoryWrite=0;
let historyWrite:Promise<unknown>=Promise.resolve();
let focusHistoryWrite:Promise<unknown>=Promise.resolve();

function emit(event:AppEvent){
 if(event.type==='live'&&preferences.value.history){
  const sample=event.data as LiveSample;
  if(retainedHistory.at(-1)?.timestamp!==sample.timestamp)retainedHistory=[...retainedHistory.filter(s=>s.timestamp>sample.timestamp-3600000).slice(-1199),sample];
  if(Date.now()-lastHistoryWrite>60000){lastHistoryWrite=Date.now();const data=JSON.stringify(retainedHistory);historyWrite=historyWrite.catch(()=>{}).then(()=>writeFile(path.join(userDirectory,'metrics-history.json'),data)).catch(()=>{});}
 }
 if(event.type==='inventory'&&event.data)diagnostics.record((event.data as NonNullable<Monitor['inventory']>).issues);
 if(win&&!win.isDestroyed())win.webContents.send('orbit:event',event);
}
async function imageData(file:string):Promise<string|null>{
 if(!file)return null;
 try{if((await stat(file)).size>10*1024*1024)return null;const content=await readFile(file);const image=nativeImage.createFromBuffer(content);return image.isEmpty()?null:image.resize({width:256,quality:'good'}).toDataURL();}catch{return null;}
}
function trusted(event:IpcMainInvokeEvent){
 assertAppFrame(event.senderFrame?.url??'',!!win&&event.senderFrame===win.webContents.mainFrame,!!win&&event.sender===win.webContents);
}
function handle(channel:string,callback:(...args:unknown[])=>unknown){ipcMain.handle(channel,(event,...args:unknown[])=>{trusted(event);return callback(...args);});}
function visible(){return !!win?.isVisible()&&!win.isMinimized();}
function show(){if(!win)return;if(win.isMinimized())win.restore();win.show();win.focus();monitor?.schedule(true);}
function setAppearance(){
 if(nativeTheme.themeSource!==preferences.value.theme)nativeTheme.themeSource=preferences.value.theme;
 win?.setBackgroundMaterial(preferences.value.transparency&&!nativeTheme.shouldUseHighContrastColors?'mica':'none');
 win?.setBackgroundColor(nativeTheme.shouldUseDarkColors?'#17191f':'#f4f5f9');
}
async function saveFocus(){
 if(preferences.value.focusHistory){const data=JSON.stringify(focus.state.history);focusHistoryWrite=focusHistoryWrite.catch(()=>{}).then(()=>writeFile(path.join(userDirectory,'focus-history.json'),data,'utf8')).catch(()=>{});await focusHistoryWrite;}
}
function finishFocus(){
 emit({type:'focus',data:focus.state});void saveFocus();
 if(preferences.value.notifications&&Notification.isSupported())new Notification({title:'Orbit · Concentration',body:'Session terminée. Prenez une petite pause.',icon,silent:false}).show();
}
function planFocus(){
 if(focusTimeout)clearTimeout(focusTimeout);focusTimeout=null;
 if(!focus.state.running||!focus.state.deadline)return;
 focusTimeout=setTimeout(()=>{
  if(focus.tick(Date.now(),preferences.value.focusHistory)){
   finishFocus();
  }else planFocus();
 },Math.max(1,focus.state.deadline-Date.now()));
}
async function loadBounds(){
 try{
  const saved=JSON.parse(await readFile(path.join(userDirectory,'window.json'),'utf8')) as {x:number;y:number;width:number;height:number;maximized:boolean};
  if(![saved.x,saved.y,saved.width,saved.height].every(Number.isFinite))return {};
  const work=screen.getDisplayMatching(saved).workArea;
  const width=Math.min(Math.max(720,saved.width),work.width),height=Math.min(Math.max(480,saved.height),work.height);
  return {x:Math.max(work.x,Math.min(saved.x,work.x+work.width-width)),y:Math.max(work.y,Math.min(saved.y,work.y+work.height-height)),width,height,maximized:!!saved.maximized};
 }catch{return {};}
}
async function main(){
 app.setAppUserModelId('fr.orbit.desktop');
 await preferences.load();await mkdir(mediaDirectory,{recursive:true});
 if(app.isPackaged&&!process.env.PORTABLE_EXECUTABLE_FILE){try{const login=app.getLoginItemSettings({path:process.execPath,args:['--startup']});if(preferences.value.startAtLogin!==login.executableWillLaunchAtLogin)await preferences.update({startAtLogin:login.executableWillLaunchAtLogin});}catch{}}
 if(preferences.value.history){try{const file=path.join(userDirectory,'metrics-history.json');if((await stat(file)).size<=8*1024*1024){const saved:unknown=JSON.parse(await readFile(file,'utf8'));if(Array.isArray(saved))retainedHistory=saved.filter(s=>s&&Number.isFinite(s.timestamp)&&s.timestamp>Date.now()-3600000&&s.cpu&&s.memory&&Array.isArray(s.gpus)&&Array.isArray(s.network)).slice(-1200) as LiveSample[];}}catch{}}
 customAvatar=await imageData(path.join(mediaDirectory,'avatar.png'));
 for(const [id,p]of Object.entries(preferences.value.devices))if(p.image){const image=await imageData(path.join(mediaDirectory,p.image));if(image)deviceImages[id]=image;}
 if(preferences.value.focusHistory){try{const history=JSON.parse(await readFile(path.join(userDirectory,'focus-history.json'),'utf8'));if(Array.isArray(history))focus.state.history=history.filter(x=>Number.isFinite(x.endedAt)&&Number.isFinite(x.minutes)).slice(-100);}catch{}}
 protocol.handle('orbit',async request=>{
  const file=rendererFile(rendererDirectory,request.url);
  if(!file||request.method!=='GET')return new Response(null,{status:403});
  return net.fetch(pathToFileURL(file).href);
 });
 // No page can open a remote connection, request permissions, or create another window.
 session.defaultSession.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
 session.defaultSession.setPermissionCheckHandler(()=>false);
 session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
 const bounds=await loadBounds();
 const initialWorkArea=screen.getPrimaryDisplay().workArea;
 win=new BrowserWindow({width:Math.min(1320,initialWorkArea.width),height:Math.min(880,initialWorkArea.height),minWidth:Math.min(720,initialWorkArea.width),minHeight:Math.min(480,initialWorkArea.height),...bounds,show:false,frame:false,icon,backgroundColor:'#f4f5f9',backgroundMaterial:'mica',autoHideMenuBar:true,
  webPreferences:{preload:path.join(app.getAppPath(),'dist-electron','preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,webSecurity:true,allowRunningInsecureContent:false,backgroundThrottling:true,spellcheck:false,devTools:!app.isPackaged}
 });
 Menu.setApplicationMenu(null);setAppearance();
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
 win.webContents.on('will-navigate',(event,url)=>{if(url!=='orbit://app/')event.preventDefault();});
 win.webContents.on('will-attach-webview',event=>event.preventDefault());
 monitor=new Monitor(new NativeBridge(nativeFile),()=>preferences.value,emit,imageData);
 const updateVisibility=()=>monitor.schedule(visible());
 win.on('minimize',updateVisibility);win.on('restore',updateVisibility);win.on('show',updateVisibility);win.on('hide',updateVisibility);
 const saveWindow=()=>{
  if(boundsTimeout)clearTimeout(boundsTimeout);
  boundsTimeout=setTimeout(()=>{if(win&&!win.isDestroyed())void writeFile(path.join(userDirectory,'window.json'),JSON.stringify({...win.getNormalBounds(),maximized:win.isMaximized()})).catch(()=>{});},400);
 };
 win.on('resize',saveWindow);win.on('move',saveWindow);
 win.on('maximize',()=>emit({type:'window',data:true}));win.on('unmaximize',()=>emit({type:'window',data:false}));
 win.on('close',event=>{if(!quitting&&preferences.value.closeToTray&&tray){event.preventDefault();win?.hide();}else{quitting=true;}});
 win.hookWindowMessage(0x0219,()=>{if(hotplugTimeout)clearTimeout(hotplugTimeout);hotplugTimeout=setTimeout(()=>monitor.changed(),1200);});
 screen.on('display-added',()=>monitor.changed());screen.on('display-removed',()=>monitor.changed());screen.on('display-metrics-changed',()=>monitor.changed());
 try{
  tray=new Tray(icon);tray.setToolTip('Orbit · Votre espace Windows');tray.on('double-click',show);
  tray.setContextMenu(Menu.buildFromTemplate([{label:'Ouvrir Orbit',click:show},{label:'Concentration',click:()=>{show();void preferences.update({page:'focus'}).then(p=>emit({type:'preferences',data:p}));}},{type:'separator'},{label:'Quitter Orbit',click:()=>{quitting=true;app.quit();}}]));
 }catch{tray=null;}
 nativeTheme.on('updated',()=>{setAppearance();emit({type:'theme',data:nativeTheme.shouldUseDarkColors});});
 powerMonitor.on('suspend',()=>monitor.schedule(false,true));
 powerMonitor.on('resume',()=>{monitor.schedule(visible(),false);if(focus.tick(Date.now(),preferences.value.focusHistory))finishFocus();planFocus();emit({type:'focus',data:focus.state});emit({type:'resume',data:null});});
 handle('orbit:bootstrap',():Bootstrap=>({preferences:preferences.value,inventory:monitor.inventory,live:monitor.live,focus:focus.state,dark:nativeTheme.shouldUseDarkColors,maximized:win?.isMaximized()??false,version:app.getVersion(),customAvatar,deviceImages,history:retainedHistory.slice(-180)}));
 handle('orbit:preferences',async patch=>{
  // Never let a forged preference choose a file outside the application media directory.
  const valid=validatePreferences(patch);
  if(valid.startAtLogin!==undefined){
   if(valid.startAtLogin&&(!app.isPackaged||process.env.PORTABLE_EXECUTABLE_FILE))throw Error('Le démarrage Windows est disponible dans la version installée.');
   app.setLoginItemSettings({openAtLogin:valid.startAtLogin,path:process.execPath,args:['--startup']});
  }
  const p=await preferences.update(valid);
  if(valid.history===false){retainedHistory=[];await historyWrite;await unlink(path.join(userDirectory,'metrics-history.json')).catch(()=>{});}
  if(valid.focusHistory===false){focus.state.history=[];await focusHistoryWrite;await unlink(path.join(userDirectory,'focus-history.json')).catch(()=>{});emit({type:'focus',data:focus.state});}
  if(valid.theme!==undefined||valid.transparency!==undefined)setAppearance();
  if(valid.interval!==undefined||valid.backgroundEco!==undefined)monitor.schedule(visible());
  emit({type:'preferences',data:p});return p;
 });
 handle('orbit:window',action=>{if(action==='minimize')win?.minimize();else if(action==='maximize'){if(win?.isMaximized())win.unmaximize();else win?.maximize();}else if(action==='close')win?.close();else if(action==='quit'){quitting=true;app.quit();}else throw Error('Commande de fenêtre invalide.');});
 handle('orbit:settings',async target=>{if(typeof target!=='string'||!Object.hasOwn(settings,target))throw Error('Réglage inconnu.');await shell.openExternal(settings[target as SettingsTarget]);});
 handle('orbit:volume',async id=>{if(typeof id!=='string'||!monitor.inventory?.volumes.some(v=>v.id===id)||!/^([A-Z]:\\)$/i.test(id))throw Error('Lecteur invalide.');const error=await shell.openPath(id);if(error)throw Error('Lecteur inaccessible.');});
 handle('orbit:audio',patch=>monitor.setAudio(validateAudio(patch)));
 handle('orbit:refresh',()=>{if(Date.now()-lastRefresh<10000)throw Error('Attendez quelques secondes avant une nouvelle analyse.');lastRefresh=Date.now();void monitor.refresh();});
 handle('orbit:focus',(action,minutes)=>{if(typeof action!=='string'||(minutes!==undefined&&typeof minutes!=='number'))throw Error('Minuteur invalide.');focus.tick(Date.now(),preferences.value.focusHistory);const value=focus.command(action,minutes as number|undefined);planFocus();emit({type:'focus',data:value});return value;});
 handle('orbit:image',async target=>{
  if(typeof target!=='string'||(target!=='avatar'&&!monitor.inventory?.devices.some(d=>d.id===target)))throw Error('Cible invalide.');
  const result=await dialog.showOpenDialog(win!,{title:'Choisir une image pour Orbit',properties:['openFile'],filters:[{name:'Images',extensions:['png','jpg','jpeg','webp']}]});
  if(result.canceled||!result.filePaths[0])return null;
  const data=await imageData(result.filePaths[0]);if(!data)throw Error('Image non lisible ou supérieure à 10 Mo.');
  const filename=target==='avatar'?'avatar.png':`device-${target}.png`;
  await writeFile(path.join(mediaDirectory,filename),nativeImage.createFromDataURL(data).toPNG());
  if(target==='avatar')customAvatar=data;
  else{deviceImages[target]=data;await preferences.update({devices:{...preferences.value.devices,[target]:{...preferences.value.devices[target],image:filename}}});emit({type:'preferences',data:preferences.value});}
  emit({type:'image',data:{target,data}});return data;
 });
 handle('orbit:remove-avatar',async()=>{await unlink(path.join(mediaDirectory,'avatar.png')).catch(()=>{});customAvatar=null;emit({type:'image',data:{target:'avatar',data:null}});});
 handle('orbit:reset',async()=>{
  const answer=await dialog.showMessageBox(win!,{type:'question',title:'Réinitialiser Orbit',message:'Effacer les préférences, les images choisies et les historiques Orbit ?',detail:'Les réglages et les fichiers Windows ne sont pas modifiés.',buttons:['Annuler','Réinitialiser'],defaultId:0,cancelId:0});
  if(answer.response!==1)return;
  await historyWrite;await focusHistoryWrite;await diagnostics.clear();
  for(const name of await readdir(mediaDirectory))if(name==='avatar.png'||/^device-[a-f0-9]{24}\.png$/.test(name))await unlink(path.join(mediaDirectory,name)).catch(()=>{});
  await unlink(path.join(userDirectory,'focus-history.json')).catch(()=>{});await unlink(path.join(userDirectory,'metrics-history.json')).catch(()=>{});
  await unlink(path.join(userDirectory,'window.json')).catch(()=>{});
  focus.command('reset');focus.state.completed=0;focus.state.history=[];retainedHistory=[];planFocus();customAvatar=null;for(const key of Object.keys(deviceImages))delete deviceImages[key];
  await preferences.update(structuredClone(defaults));app.setLoginItemSettings({openAtLogin:false});setAppearance();emit({type:'preferences',data:preferences.value});emit({type:'image',data:{target:'avatar',data:null}});win?.webContents.reload();
 });
 await win.loadURL('orbit://app/');
 if(bounds.maximized)win.maximize();
 const startup=process.argv.includes('--startup');
 if(!(startup&&preferences.value.startMinimized&&tray))show();
 monitor.start(visible());monitor.schedule(visible());
}

if(!app.requestSingleInstanceLock())app.quit();
else{
 if(!app.isPackaged)process.on('message',message=>{if(message&&typeof message==='object'&&'command'in message&&message.command==='orbit:dev-quit'){quitting=true;app.quit();}});
 app.on('second-instance',()=>show());
 app.whenReady().then(main).catch(error=>{dialog.showErrorBox('Orbit ne peut pas démarrer',String(error instanceof Error?error.message:error));app.quit();});
 app.on('before-quit',()=>{quitting=true;monitor?.stop();if(focusTimeout)clearTimeout(focusTimeout);if(hotplugTimeout)clearTimeout(hotplugTimeout);if(boundsTimeout)clearTimeout(boundsTimeout);tray?.destroy();});
 app.on('window-all-closed',()=>app.quit());
}
