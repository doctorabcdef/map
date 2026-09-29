import { defineConfig } from 'vite';
export default defineConfig({base:'./',build:{chunkSizeWarningLimit:650,rollupOptions:{input:{main:'index.html',real:'real/index.html'}}},server:{port:5173}});
