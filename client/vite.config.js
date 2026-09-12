import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// During local dev the client proxies API + uploads to the Express server.
// In production the app is served same-origin, so these paths just work.
var API_TARGET = 'http://localhost:4000';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    return ({
        base: mode === 'github-pages' ? '/fuelIQ/' : '/',
        plugins: [react()],
        server: {
            port: 5173,
            proxy: {
                '/api': { target: API_TARGET, changeOrigin: true },
                '/uploads': { target: API_TARGET, changeOrigin: true },
            },
        },
    });
});
