import { defineConfig } from 'vite';
export default defineConfig({ base:'./', publicDir:false,
  build:{outDir:'dist-renderer',target:'chrome144',sourcemap:false}, esbuild:{jsx:'automatic'},
  server:{host:'127.0.0.1',strictPort:true,port:5173}
});
