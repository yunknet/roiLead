import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Calculadora da Reforma Tributária: em localhost repassa para o motor da Receita
    // (padrão http://localhost:8081, ou CALCULADORA_RTC_URL). Em produção quem faz isso é o nginx.
    proxy: {
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
