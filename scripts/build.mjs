import { build as bundle } from 'esbuild';
import { build as viteBuild } from 'vite';
import { access } from 'node:fs/promises';
import { collectLicenses } from './licenses.mjs';
await access('build/native/OrbitBridge.exe');
await collectLicenses();
await Promise.all([
 bundle({entryPoints:['electron/main/index.ts'],outfile:'dist-electron/main.cjs',bundle:true,platform:'node',target:'node24',format:'cjs',packages:'external',sourcemap:false}),
 bundle({entryPoints:['electron/preload/index.ts'],outfile:'dist-electron/preload.cjs',bundle:true,platform:'node',target:'node24',format:'cjs',external:['electron'],sourcemap:false}),
 viteBuild()
]);
console.log('Orbit : collecteur, processus Electron, preload et interface construits.');
