import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';
import fs from 'fs';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [wasm(), topLevelAwait(), svelte()],
  server: {
    https: (() => {
      // Use the same certificate path logic as sync-server
      const certPath = process.env.CERT_PATH || '/etc/letsencrypt/live/dweb.feathers.cloud';
      const keyPath = path.join(certPath, 'privkey.pem');
      const certFilePath = path.join(certPath, 'fullchain.pem');
      
      // Check if certificates exist
      if (fs.existsSync(keyPath) && fs.existsSync(certFilePath)) {
        return {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certFilePath)
        };
      }
      
      // Fallback to auto-generated certificate
      return true;
    })(),
    host: '0.0.0.0', // Allow external connections
    port: 3000
  }
})
