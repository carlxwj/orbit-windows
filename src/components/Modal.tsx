import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
export function Modal({title,children,onClose,className=''}:{title:string;children:ReactNode;onClose:()=>void;className?:string}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{const dialog=ref.current!;if(!dialog.open)dialog.showModal();return()=>{dialog.close();};},[]);
 return <dialog ref={ref} className={`modal ${className}`} aria-label={title} onCancel={onClose} onClick={e=>{if(e.target!==ref.current)return;const r=ref.current.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)onClose();}}><header className="modal-header"><h2>{title}</h2><button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={17}/></button></header>{children}</dialog>;
}
