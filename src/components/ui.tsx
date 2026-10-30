import type { ReactNode, ComponentType } from 'react';
import { Info, ArrowUpRight, LoaderCircle, AlertCircle, UserRound, ChevronRight } from 'lucide-react';
import type { Metric, SettingsTarget } from '../../shared/contracts.ts';
import { fr } from '../i18n/fr.ts';
import { useInventory, useUI, run } from '../services/store.ts';

export const format=(value:number,digits=0)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:digits}).format(value);
export const size=(value:number|null|undefined,digits=1)=>value==null?'—':value>=1024**4?`${format(value/1024**4,digits)} To`:value>=1024**3?`${format(value/1024**3,digits)} Go`:value>=1024**2?`${format(value/1024**2,digits)} Mo`:`${format(value/1024,digits)} Ko`;
export const rate=(value:number|null|undefined)=>value==null?'—':`${size(value)}/s`;
export function value<T>(m:Metric<T>|undefined,suffix=''):string{return m?.value==null?fr.unavailable:typeof m.value==='boolean'?m.value?'Oui':'Non':`${typeof m.value==='number'?format(m.value,m.unit==='Hz'?3:2):String(m.value)}${suffix|| (m.unit?' '+m.unit:'')}`;}
export function MetricText({metric,suffix=''}:{metric:Metric<unknown>|undefined;suffix?:string}){return <span className={metric?.value==null?'unavailable':''} title={metric?`${fr.states[metric.state]} · ${metric.source}`:fr.loading}>{value(metric,suffix)}</span>;}
export function Panel({title,icon:Icon,action,children,className=''}:{title?:string;icon?:ComponentType<{size?:number}>;action?:ReactNode;children:ReactNode;className?:string}){return <section className={`panel ${className}`}>{title&&<header className="panel-head"><h2>{Icon&&<Icon size={17}/>} {title}</h2>{action}</header>}{children}</section>;}
export function Button({children,onClick,className='',disabled=false,title}:{children:ReactNode;onClick:()=>void;className?:string;disabled?:boolean;title?:string}){return <button className={`button ${className}`} onClick={onClick} disabled={disabled} title={title}>{children}</button>;}
export function SettingsLink({target,children=fr.windows}:{target:SettingsTarget;children?:ReactNode}){return <button className="settings-link" onClick={()=>{void run(window.orbit.openSettings(target));}}>{children}<ArrowUpRight size={14}/></button>;}
export function InfoNote({children}:{children:ReactNode}){return <div className="info-note"><Info size={16}/><p>{children}</p></div>;}
export function Empty({title,children,loading=false}:{title:string;children?:ReactNode;loading?:boolean}){return <div className="empty">{loading?<LoaderCircle className="loading-spin" size={25}/>:<AlertCircle size={25}/>}<strong>{title}</strong>{children&&<p>{children}</p>}</div>;}
export function Detail({label,children}:{label:string;children:ReactNode}){return <div className="detail"><dt>{label}</dt><dd>{children||fr.unavailable}</dd></div>;}
export function Avatar({large=false}:{large?:boolean}){const inventory=useInventory(),ui=useUI();const photo=ui.customAvatar||inventory?.system.photo;const name=inventory?.system.displayName;return <span className={`avatar ${large?'avatar-large':''}`}>{photo?<img src={photo} alt={`Photo de ${name??'votre profil'}`}/>:name?<span>{name.split(/[\s._-]/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()}</span>:<UserRound size={large?28:16}/>}</span>;}
export function RowButton({title,description,onClick,children}:{title:string;description?:string;onClick?:()=>void;children?:ReactNode}){return <div className="preference-row"><div><strong>{title}</strong>{description&&<p>{description}</p>}</div>{children??<button className="icon-button" aria-label={title} onClick={onClick}><ChevronRight size={17}/></button>}</div>;}
export function Toggle({checked,onChange,label,disabled=false}:{checked:boolean;onChange:(checked:boolean)=>void;label:string;disabled?:boolean}){return <button type="button" className={`toggle ${checked?'checked':''}`} role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={()=>onChange(!checked)}><span/></button>;}
