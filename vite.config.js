import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        // Aumentamos el límite de advertencia a 1000 kB (1 MB) para evitar el warning
        // causado por la agrupación necesaria de las dependencias principales.
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    // Crea chunks separados para las dependencias más grandes
                    if (id.includes('node_modules')) {
                        if (id.includes('recharts')) {
                            return 'vendor_recharts';
                        }
                        if (id.includes('@tanstack/react-table')) {
                            return 'vendor_react-table';
                        }
                        // Mantenemos react-router-dom separado
                        if (id.includes('react-router-dom') || id.includes('react-router')) {
                            return 'vendor_react-router';
                        }
                        // CRÍTICO: React y React-DOM se dejan fuera de la separación manual
                        // para asegurar la inicialización correcta.
                        if (id.includes('@supabase')) {
                            return 'vendor_supabase';
                        }
                        // Agrupa el resto de vendors en un chunk genérico
                        return 'vendor';
                    }
                },
            },
        },
    },
    preview: {
        host: true,
        allowedHosts: ['n8n-dashboard2.mv7mvl.easypanel.host']
    }
});
