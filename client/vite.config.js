import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// Origin, который дев-прокси подставляет при перенаправлении WebSocket на
// Go-сервер. Нужен, чтобы пройти проверку Origin (ALLOWED_ORIGINS) на сигнальном
// сервере, когда страница открыта с телефона по https://<IP-мака>:5173.
// При необходимости поменяй на значение из ALLOWED_ORIGINS своего dev-сервера.
const WS_ORIGIN = 'http://localhost:5173';

export default defineConfig({
  // basicSsl() выдаёт самоподписанный сертификат и включает HTTPS — он обязателен,
  // чтобы getUserMedia (камера/микрофон) работал на телефоне в локальной сети.
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
    host: true, // слушать на всех интерфейсах: доступ с телефона по LAN
    // Прокси сигнального WebSocket на Go-сервер во время разработки, чтобы клиент
    // использовал тот же путь "/ws", что и в продакшене.
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
        secure: false,
        changeOrigin: true,
        configure: (proxy) => {
          // Перед апгрейдом WS подставляем доверенный Origin для Go-сервера.
          proxy.on('proxyReqWs', (proxyReq) => {
            proxyReq.setHeader('origin', WS_ORIGIN);
          });
        },
      },
    },
  },
});
