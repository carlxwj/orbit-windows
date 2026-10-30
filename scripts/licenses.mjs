import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function collectLicenses(){
 const names=['react','react-dom','lucide-react'];const notices=[];
 for(const name of names){const license=await readFile(path.resolve('node_modules',name,'LICENSE'),'utf8');notices.push(`${name}\n${'='.repeat(name.length)}\n${license}`);}
 await writeFile('assets/third-party-licenses.txt',notices.join('\n\n'),'utf8');
}
