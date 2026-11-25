import fs from 'node:fs';
import path from 'node:path';
import { createTunnel } from 'tunnel-ssh';

// Suppress ECONNRESET errors from SSH socket when connection closes
process.on('uncaughtException', (err: Error & { code?: string }) => {
  if (err.code === 'ECONNRESET') {
    return;
  }
  console.error('Uncaught exception:', err);
});

// Helper to load .env variables manually without external dependencies
function loadEnv(): Record<string, string> {
  const envFilePath = fs.existsSync(path.resolve(process.cwd(), '.env'))
    ? path.resolve(process.cwd(), '.env')
    : path.resolve(process.cwd(), '.env.devel');

  const envVars: Record<string, string> = {};
  if (fs.existsSync(envFilePath)) {
    const lines = fs.readFileSync(envFilePath, 'utf-8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key] = value;
      }
    }
  }
  return envVars;
}

const env = { ...loadEnv(), ...process.env };

function requireEnv(name: string): string {
  const v = env[name];
  if (!v) {
    console.error(`❌ ${name} belum di-set (isi di .env atau environment). Lihat docs/handover/02-KONFIGURASI.md.`);
    process.exit(1);
  }
  return v;
}

const SSH_HOST = requireEnv('SSH_HOST');
const SSH_PORT = Number(env.SSH_PORT || 22);
const SSH_USER = requireEnv('SSH_USER');
// Pakai SSH key (SSH_KEY_PATH) bila ada; password hanya cadangan.
const SSH_KEY_PATH = env.SSH_KEY_PATH;
const SSH_PASSWORD = env.SSH_PASSWORD;
if (!SSH_KEY_PATH && !SSH_PASSWORD) {
  console.error('❌ Isi SSH_KEY_PATH (disarankan) atau SSH_PASSWORD.');
  process.exit(1);
}

const DB_HOST = env.SSH_TARGET_HOST || 'localhost';
const DB_PORT = Number(env.SSH_TARGET_PORT || 5432);
const LOCAL_PORT = Number(env.SSH_LOCAL_PORT || env.TUNNEL_LOCAL_PORT || 5433);

async function startTunnel() {
  console.log('Establishing SSH tunnel to Database Server...');
  console.log(`📡 Bastion: ${SSH_USER}@${SSH_HOST}:${SSH_PORT}`);
  console.log(`🔗 Forwarding: 127.0.0.1:${LOCAL_PORT} -> ${DB_HOST}:${DB_PORT}`);

  try {
    const [server, client] = await createTunnel(
      { autoClose: false, reconnectOnError: false },
      { port: LOCAL_PORT, host: '127.0.0.1' },
      {
        host: SSH_HOST,
        port: SSH_PORT,
        username: SSH_USER,
        ...(SSH_KEY_PATH ? { privateKey: fs.readFileSync(SSH_KEY_PATH) } : { password: SSH_PASSWORD }),
      },
      { srcAddr: '127.0.0.1', srcPort: LOCAL_PORT, dstAddr: DB_HOST, dstPort: DB_PORT }
    );

    console.log(`\n======================================================`);
    console.log(`✅ SSH Tunnel established successfully!`);
    console.log(`📡 Remote DB (${DB_HOST}:${DB_PORT}) is forwarded to:`);
    console.log(`   👉 localhost:${LOCAL_PORT}`);
    console.log(`======================================================\n`);
    console.log(`Keep this terminal running while using the server DB.`);
    console.log(`Press Ctrl+C to close the tunnel.\n`);

    server.on('connection', (socket) => {
      socket.on('error', (err: any) => {
        if (err.code === 'ECONNRESET') return;
        console.error('Socket error:', err.message);
      });
    });

    client.on('error', (err: any) => {
      if (err.code === 'ECONNRESET') return;
      console.error('SSH client error:', err.message);
    });

    client.on('close', () => {
      console.log('SSH connection closed.');
    });

    const cleanup = () => {
      console.log('\nClosing SSH tunnel...');
      server.close();
      client.end();
      process.exit(0);
    };

    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
  } catch (err) {
    console.error('❌ Failed to establish SSH tunnel:', err);
    process.exit(1);
  }
}

startTunnel();
