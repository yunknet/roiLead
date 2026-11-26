import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Calculadora da Reforma Tributária: em localhost repassa para os motores da Receita
    // (regime regular: http://localhost:8081 ou CALCULADORA_RTC_URL;
    //  Simples Nacional: http://localhost:8082 ou CALCULADORA_SN_URL). Em produção quem faz isso é o nginx.
    // O Simples vem primeiro porque "/api/calculadora" também casaria com "/api/calculadora-sn".
    proxy: {
      "/api/calculadora-sn": {
        target: process.env.CALCULADORA_SN_URL || "http://localhost:8082",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/calculadora-sn/, "/api"),
      },
      "/api/calculadora": { target: process.env.CALCULADORA_RTC_URL || "http://localhost:8081", changeOrigin: true },
      "/api/api-docs": { target: process.env.CALCULADORA_RTC_URL || "http://localhost:8081", changeOrigin: true },
    },
  },
  preview: {
    host: true,
    allowedHosts: true,
  },
  plugins: [react()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
