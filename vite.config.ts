import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

const dynamicContentWatchIgnores = [
  '**/data/site-content.json',
  '**/public/site-content.json',
];

export default defineConfig(() => {
  const buildId = new Date().toISOString();

  return {
    base: '/truongthlevantampongdrang/',
    plugins: [react(), tailwindcss()],
    define: {
      __APP_BUILD_ID__: JSON.stringify(buildId),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: dynamicContentWatchIgnores,
      },
    },
  };
});
