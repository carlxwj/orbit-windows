export type MetricState='available'|'unsupported'|'permission_required'|'temporarily_unavailable'|'error';
export interface Metric<T>{value:T|null;state:MetricState;source:string;updatedAt:number;unit?:string;detail?:string}
export type Page='overview'|'performance'|'hardware'|'devices'|'displays'|'storage'|'network'|'audio'|'account'|'focus'|'settings';
export type Category='keyboard'|'mouse'|'headset'|'controller'|'audio'|'receiver'|'other';
export type Connection='usb'|'bluetooth'|'wireless_2_4g'|'wireless_receiver'|'unknown';
export interface Peripheral{id:string;name:string;manufacturer:string;category:Category;connection:Connection;presence:'connected'|'receiver_present'|'disconnected';battery:Metric<number>;lastSeen:number;vendorId:string|null;productId:string|null;instanceIds:string[];interfaces:number;identification:string}
export interface DevicePreference{name?:string;category?:Category;favorite?:boolean;hidden?:boolean;image?:string;connection?:Connection}
export interface Preferences{
 theme:'system'|'light'|'dark';accent:'blue'|'lavender'|'graphite';transparency:boolean;reducedMotion:boolean;compact:boolean;collapsedSidebar:boolean;page:Page;
 interval:1000|3000|5000|10000;temperatures:boolean;advanced:boolean;backgroundEco:boolean;history:boolean;focusHistory:boolean;notifications:boolean;
 startAtLogin:boolean;startMinimized:boolean;closeToTray:boolean;devices:Record<string,DevicePreference>;monitorNames:Record<string,string>;monitorPanels:Record<string,string>;
}
export interface CpuInfo{model:string;manufacturer:string;architecture:string;logical:number;physical:Metric<number>;nominalMHz:Metric<number>;maxMHz:Metric<number>;l2KiB:Metric<number>;l3KiB:Metric<number>}
export interface GpuInfo{id:string;name:string;vendor:string;driver:string;driverDate:string;dedicated:Metric<number>;hardwareId:string}
export interface MemoryModule{slot:string;capacity:number|null;manufacturer:string;part:string;type:string;ratedMTs:Metric<number>;configuredMTs:Metric<number>}
export interface PhysicalDisk{id:string;model:string;manufacturer:string;capacity:number|null;bus:string;media:string;health:Metric<string>;temperature:Metric<number>;volumes:string[]}
export interface Volume{id:string;label:string;total:number;free:number;filesystem:string;physicalId:string|null}
export interface Monitor{id:string;name:string;manufacturer:string;deviceName:string;primary:boolean;x:number;y:number;width:number;height:number;refresh:Metric<number>;scale:Metric<number>;orientation:string;connection:string;nativeWidth:Metric<number>;nativeHeight:Metric<number>;widthCm:Metric<number>;heightCm:Metric<number>;hdr:Metric<boolean>;hdrSupported:Metric<boolean>;bits:Metric<number>;modes:string[];edid:string}
export interface Adapter{id:string;name:string;type:string;status:string;speed:number;ipv4:string[]}
export interface NetworkSample{id:string;name:string;received:number;sent:number;download:Metric<number>;upload:Metric<number>}
export interface AudioState{volume:number;muted:boolean;name:string;outputs:{id:string;name:string;isDefault:boolean}[]}
export interface GpuSample{id:string;name:string;load:Metric<number>;used:Metric<number>;total:Metric<number>;temperature:Metric<number>;clock:Metric<number>;memoryClock:Metric<number>;power:Metric<number>;fan:Metric<number>;shared:Metric<number>}
export interface LiveSample{timestamp:number;cpu:Metric<number>;perCore:number[];cpuMHz:Metric<number>;cpuTemperature:Metric<number>;memory:{total:number;free:number;used:number;percent:number};gpus:GpuSample[];network:NetworkSample[];diskRead:Metric<number>;diskWrite:Metric<number>;diskActivity:Metric<number>;audio:Metric<AudioState>;battery:Metric<number>;uptime:number;collector:Metric<string>}
export interface Inventory{
 timestamp:number;cpu:CpuInfo;gpus:GpuInfo[];memory:MemoryModule[];
 system:{hostname:string;username:string;displayName:string;os:string;edition:string;build:string;architecture:string;machineType:string;bootTime:number;accountType:string;photo:string|null};
 board:{manufacturer:string;model:string;revision:string;bios:string;biosDate:string;uefi:Metric<boolean>;tpm:Metric<string>;secureBoot:Metric<boolean>;chipset:Metric<string>};
 volumes:Volume[];disks:PhysicalDisk[];devices:Peripheral[];displays:Monitor[];adapters:Adapter[];
 wifi:Metric<{ssid:string;signal:number;rx:number;tx:number;band:string}>;bluetooth:{present:boolean;radio:Metric<boolean>};vpn:Metric<{name:string;connected:boolean|null}[]>;
 sensors:{name:string;type:string;value:number;unit:string;source:string}[];issues:{collector:string;state:MetricState}[];
}
export interface FocusState{duration:number;remaining:number;deadline:number|null;running:boolean;completed:number;history:{endedAt:number;minutes:number}[]}
export interface Bootstrap{preferences:Preferences;inventory:Inventory|null;live:LiveSample|null;focus:FocusState;dark:boolean;maximized:boolean;version:string;customAvatar:string|null;deviceImages:Record<string,string>;history:LiveSample[]}
export interface AppEvent{type:'live'|'inventory'|'preferences'|'focus'|'theme'|'window'|'resume'|'image';data:unknown}
export type SettingsTarget='wifi'|'bluetooth'|'vpn'|'airplane'|'sound'|'display'|'graphics'|'hdr'|'advancedDisplay'|'storage'|'cleanup'|'account'|'accounts'|'security'|'updates'|'notifications'|'power'|'network'|'focus'|'accessibility'|'personalization';
export interface OrbitAPI{
 bootstrap():Promise<Bootstrap>;subscribe(callback:(event:AppEvent)=>void):()=>void;preferences(patch:Partial<Preferences>):Promise<Preferences>;
 window(action:'minimize'|'maximize'|'close'|'quit'):Promise<void>;openSettings(target:SettingsTarget):Promise<void>;openVolume(id:string):Promise<void>;
 audio(patch:{volume?:number;muted?:boolean}):Promise<AudioState>;refresh():Promise<void>;focus(action:'start'|'pause'|'reset'|'duration',minutes?:number):Promise<FocusState>;
 image(target:'avatar'|string):Promise<string|null>;removeAvatar():Promise<void>;reset():Promise<void>;
}
declare global{interface Window{orbit:OrbitAPI}}
