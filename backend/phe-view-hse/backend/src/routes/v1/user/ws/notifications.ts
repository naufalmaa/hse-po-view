// src/routes/v1/user/ws/notifications.ts
import * as ws from 'ws';
import type { FastifyPluginAsync } from 'fastify';
import {
  connectedClients,
  isClientConnected,
} from '../../../../ws/clients.ts';
import { sendUnreadAlarms } from "../../../../ws/helpers.ts";

const notificationWebSocketRoute: FastifyPluginAsync = async (app) => {
  app.get('/notifications', { websocket: true }, async (connection, req) => {
    const socket = connection as ws.WebSocket;
    const user = req.session.user;
    if (!user?.id || !user.role) {
      return socket.close();
    }

    // Simpan socket ke map aktif
    connectedClients.set(user.id, { socket, role: user.role });

    // Kirim notifikasi unread jika user masih connected
    if (isClientConnected(user.id)) {
      await sendUnreadAlarms(user.id);
    }

    // Cleanup saat disconnect/error
    const cleanup = () => {
      const current = connectedClients.get(user.id);
      if (current?.socket === socket) {
        connectedClients.delete(user.id);
      }
    };

    socket.on('close', cleanup);
    socket.on('error', cleanup);
  });
};

export default notificationWebSocketRoute;
