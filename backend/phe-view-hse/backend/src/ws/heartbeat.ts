// src/ws/heartbeat.ts

import { connectedClients, isClientConnected } from './clients.ts';

export function startWebSocketHeartbeat() {
  setInterval(() => {
    for (const [userId, clientInfo] of connectedClients) {
      if (isClientConnected(userId)) {
        try {
          clientInfo.socket.send(JSON.stringify({ type: 'ping' }));
        } catch (err) {
          console.warn(`[WS] Failed to send heartbeat to ${userId}, removing...`);
          connectedClients.delete(userId);
        }
      } else {
        console.warn(`[WS] Socket not open for ${userId}, removing...`);
        connectedClients.delete(userId);
      }
    }
  }, 30_000); // Setiap 30 detik
}

