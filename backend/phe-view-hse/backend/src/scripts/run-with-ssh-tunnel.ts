/**
 * Script wrapper to run commands through SSH tunnel
 * Automatically creates SSH tunnel to database server
 */

import { createTunnel } from 'tunnel-ssh';
import { spawn } from 'child_process';
import fs from 'node:fs';

// Suppress ECONNRESET errors from SSH socket
process.on('uncaughtException', (err: Error & { code?: string }) => {
  if (err.code === 'ECONNRESET') {
    // Silent exit - this is expected when SSH tunnel closes
    process.exit(0);
  }
  console.error('Uncaught exception:', err);
  process.exit(1);
});

// Semua nilai dari environment; tidak ada kredensial bawaan di kode.
function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`${name} belum di-set. Lihat docs/handover/02-KONFIGURASI.md (bagian SSH tunnel).`);
    process.exit(1);
  }
  return v;
}

const SSH_HOST = requireEnv('SSH_HOST');
const SSH_PORT = Number(process.env.SSH_PORT || 22);
const SSH_USER = requireEnv('SSH_USER');
const SSH_KEY_PATH = process.env.SSH_KEY_PATH;
const SSH_PASSWORD = process.env.SSH_PASSWORD;
const DB_HOST = process.env.SSH_TARGET_HOST || '127.0.0.1';
const DB_PORT = Number(process.env.SSH_TARGET_PORT || 5432);
const LOCAL_PORT = Number(process.env.SSH_LOCAL_PORT || 5433);

// Remote database credentials
const REMOTE_DB_USER = requireEnv('REMOTE_DB_USER');
const REMOTE_DB_PASSWORD = requireEnv('REMOTE_DB_PASSWORD');
const REMOTE_DB_NAME = requireEnv('REMOTE_DB_NAME');

async function runWithTunnel() {
  console.log('Creating SSH tunnel...');
  console.log(`Tunnel: localhost:${LOCAL_PORT} -> ${DB_HOST}:${DB_PORT} via ${SSH_HOST}:${SSH_PORT}`);

  const tunnelOptions = {
    autoClose: true,
    reconnectOnError: false,
  };

  const serverOptions = {
    port: LOCAL_PORT,
    host: '127.0.0.1',
  };

  const sshOptions = {
    host: SSH_HOST,
    port: SSH_PORT,
    username: SSH_USER,
    ...(SSH_KEY_PATH ? { privateKey: fs.readFileSync(SSH_KEY_PATH) } : { password: SSH_PASSWORD }),
  };

  const forwardOptions = {
    srcAddr: '127.0.0.1',
    srcPort: LOCAL_PORT,
    dstAddr: DB_HOST,
    dstPort: DB_PORT,
  };

  try {
    console.log('Connecting to SSH server...');
    console.log(`SSH: ${SSH_USER}@${SSH_HOST}:${SSH_PORT}`);
    console.log(`Forwarding: localhost:${LOCAL_PORT} -> ${DB_HOST}:${DB_PORT}\n`);
    
    const [server, client] = await createTunnel(tunnelOptions, serverOptions, sshOptions, forwardOptions);
    
    console.log('SSH tunnel established successfully!\n');
    
    // Handle SSH client errors (ignore ECONNRESET on close)
    client.on('error', (err: Error & { code?: string }) => {
      if (err.code !== 'ECONNRESET') {
        console.error('SSH client error:', err.message);
      }
    });
    
    client.on('close', () => {
      // Silent close - expected when tunnel closes
    });
    
    // Prevent unhandled error on socket
    client.on('end', () => {
      // Silent end - expected
    });

    // Get the script to run from command line arguments
    const scriptToRun = process.argv[2];
    if (!scriptToRun) {
      console.error('Usage: npx tsx src/scripts/run-with-ssh-tunnel.ts <script-path>');
      console.error('Example: npx tsx src/scripts/run-with-ssh-tunnel.ts src/scripts/check-pob-employees.ts');
      server.close();
      process.exit(1);
    }

    console.log(`Running: ${scriptToRun}\n`);

    // Run the target script with modified environment
    const env = { 
      ...process.env, 
      POSTGRES_HOST: '127.0.0.1', 
      POSTGRES_PORT: String(LOCAL_PORT),
      POSTGRES_USER: REMOTE_DB_USER,
      POSTGRES_PASSWORD: REMOTE_DB_PASSWORD,
      POSTGRES_DB: REMOTE_DB_NAME
    };
    
    const child = spawn('npx', ['tsx', scriptToRun], {
      stdio: 'inherit',
      env,
      cwd: process.cwd(),
      shell: true,
    });

    child.on('close', (code) => {
      console.log(`\nScript exited with code ${code}`);
      // Give time for socket to close gracefully
      setTimeout(() => {
        server.close();
        process.exit(code || 0);
      }, 100);
    });

    child.on('error', (err) => {
      console.error('Failed to run script:', err);
      server.close();
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to create SSH tunnel:', error);
    process.exit(1);
  }
}

runWithTunnel();
