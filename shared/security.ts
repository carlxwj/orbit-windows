import path from 'node:path';

export function assertAppFrame(senderUrl:string,mainFrame:boolean,ownedWindow:boolean):void{
 let url:URL;try{url=new URL(senderUrl);}catch{throw Error('Origine IPC non autorisée.');}
 if(!ownedWindow||!mainFrame||url.protocol!=='orbit:'||url.hostname!=='app'||url.port||url.username||url.password||url.pathname!=='/'||url.search)throw Error('Origine IPC non autorisée.');
}
export function rendererFile(directory:string,address:string):string|null{
 try{
  const url=new URL(address);
  if(url.protocol!=='orbit:'||url.hostname!=='app'||url.port||url.username||url.password)return null;
  const relative=decodeURIComponent(url.pathname);
  if(relative.includes('\\')||relative.includes('\0'))return null;
  const file=path.resolve(directory,relative==='/'?'index.html':'.'+relative);
  return file.startsWith(path.resolve(directory)+path.sep)&&['.html','.js','.css','.svg','.png','.woff2'].includes(path.extname(file))?file:null;
 }catch{return null;}
}
