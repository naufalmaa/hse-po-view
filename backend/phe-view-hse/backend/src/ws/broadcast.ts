// src/ws/broadcast.ts

import { connectedClients, isClientConnected, getConnectedClientsByRole } from './clients.ts';

export function broadcastAlarmToUser(userId: string, data: any) {
  if (!isClientConnected(userId)) {
    console.warn(`[WS] Cannot send notification, userId ${userId} not connected`);
    return;
  }

  const client = connectedClients.get(userId);
  try {
    client!.socket.send(JSON.stringify({ type: 'notification', data }));
    console.log(`[WS] Sent notification to userId: ${userId}`);
  } catch (err) {
    console.error(`[WS] Failed to send notification to userId: ${userId}`, err);
  }
}

export function broadcastToRole(role: string, data: any) {
  const userIds = getConnectedClientsByRole(role);

  for (const userId of userIds) {
    broadcastAlarmToUser(userId, data);
  }

  console.log(`[WS] Broadcasted to ${userIds.length} user(s) with role '${role}'`);
}
