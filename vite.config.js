import { defineConfig } from 'vite';

// Development only. Production remains the same buildless Pages directory.
export default defineConfig({
  publicDir: false,
  server: { host: '0.0.0.0', port: 4200, allowedHosts: ['terminal.local'] },
});
