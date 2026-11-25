import * as ws from 'ws';

export interface ConnectedClientInfo {
  socket: ws.WebSocket;
  role: 'admin' | 'contractor' | string;
}

export const connectedClients = new Map<string, ConnectedClientInfo>();

export function getConnectedClientsByRole(role: string): string[] {
  return Array.from(connectedClients.entries())
    .filter(([, client]) => client.role === role && client.socket.readyState === ws.WebSocket.OPEN)
    .map(([userId]) => userId);
}

export function isClientConnected(userId: string): boolean {
  const client = connectedClients.get(userId);
  return !!client && client.socket.readyState === ws.WebSocket.OPEN;
}
