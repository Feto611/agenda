import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import react from "@vitejs/plugin-react";
export default defineConfig({
    build: {
        rollupOptions: {
            output: {
                manualChunks: { realtime: ["laravel-echo", "pusher-js"] },
            },
        },
    },
    plugins: [
        laravel({ input: ["resources/js/app.tsx"], refresh: true }),
        react(),
    ],
});
