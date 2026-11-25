import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { type Static, Type } from '@sinclair/typebox';
import envSchema from 'env-schema';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const LogLevel = {
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warn: 'warn',
  error: 'error',
} as const;

const schema = Type.Object({
  PROTOCOL: Type.String({ default: 'http' }),
  POSTGRES_HOST: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_DB: Type.String(),
  POSTGRES_PORT: Type.Number({ default: 5432 }),
  LOG_LEVEL: Type.Enum(LogLevel),
  HOST: Type.String({ default: 'localhost' }),
  PORT: Type.Number({ default: 3000 }),
  COOKIE_PREFIX: Type.String({ default: 'cookie' }),
  BETTER_AUTH_SECRET: Type.String({ default: 'secret' }),
  FRONTEND_URL: Type.String({ default: 'http://localhost:5153' }),
  BASE_URL: Type.Optional(Type.String()),
  BREVO_API_KEY: Type.Optional(Type.String()),
  // Pengirim email (harus domain/alamat yang sudah diverifikasi di Brevo)
  EMAIL_FROM_ADDRESS: Type.String({ default: 'no-reply@example.com' }),
  EMAIL_FROM_NAME: Type.String({ default: 'HSE Proview No-Reply' }),
  CHROME_PATH: Type.Optional(Type.String()),
  MARINE_HOURS_POB_PHE_OSES: Type.Optional(Type.Number()),
  MARINE_HOURS_POB_CONTRACTOR: Type.Optional(Type.Number()),
  CSMS_AI_SERVICE_URL: Type.String({ default: 'http://localhost:8000' }),
  UPLOADS_DIR: Type.Optional(Type.String({ default: '../uploads' })),
});

// ENV_FILE lets one codebase run as prod / dev / demo (e.g. ENV_FILE=.env.demo).
const envFilePath = process.env.ENV_FILE
  ? process.env.ENV_FILE
  : fs.existsSync(path.resolve(process.cwd(), '.env'))
    ? '.env'
    : '.env.devel';

// env-schema hanya membaca file env untuk variabel di skema dan tidak mengisi process.env. Beberapa bagian
// (Better Auth, init-data, CSMS_AI_JOB_STALE_MINUTES) membaca process.env langsung, jadi isi variabel yang
// belum ada dari file yang sama. Variabel environment yang sudah di-set tetap menang (seperti dotenv).
function loadEnvFileIntoProcess(file: string): void {
  const full = path.resolve(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  for (const line of fs.readFileSync(full, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    let value = m[2];
    if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, '');
    process.env[m[1]] = value;
  }
}
loadEnvFileIntoProcess(envFilePath);

const env = envSchema<Static<typeof schema>>({
  dotenv: {
    path: envFilePath,
  },
  schema,
});

export function getUploadsRootDir(): string {
  if (env.UPLOADS_DIR) {
    const custom = path.isAbsolute(env.UPLOADS_DIR)
      ? env.UPLOADS_DIR
      : path.resolve(process.cwd(), env.UPLOADS_DIR);
    if (fs.existsSync(custom)) return custom;
    // Explicit UPLOADS_DIR is authoritative (e.g. uploads_demo): create it instead of silently
    // falling back to another uploads folder.
    fs.mkdirSync(custom, { recursive: true });
    return custom;
  }

  const candidates = [
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), '../uploads'),
    path.resolve(process.cwd(), '../../uploads'),
    path.resolve(process.cwd(), 'backend/uploads'),
    path.resolve(__dirname, '../../uploads'),
    path.resolve(__dirname, '../../../uploads'),
    path.resolve(__dirname, '../../../../uploads'),
  ];

  for (const dir of candidates) {
    if (fs.existsSync(dir)) {
      return dir;
    }
  }

  return path.resolve(process.cwd(), env.UPLOADS_DIR ?? '../uploads');
}

export function uploadsPath(...segments: string[]): string {
  return path.resolve(getUploadsRootDir(), ...segments);
}

export function resolveExistingUploadFile(...segments: string[]): string | null {
  const root = getUploadsRootDir();
  const directPath = path.resolve(root, ...segments);
  if (fs.existsSync(directPath)) return directPath;

  const candidateRoots = [
    path.resolve(process.cwd(), 'uploads'),
    path.resolve(process.cwd(), '../uploads'),
    path.resolve(process.cwd(), '../../uploads'),
    path.resolve(process.cwd(), 'backend/uploads'),
    path.resolve(__dirname, '../../uploads'),
    path.resolve(__dirname, '../../../uploads'),
    path.resolve(__dirname, '../../../../uploads'),
  ];

  for (const candRoot of candidateRoots) {
    const testPath = path.resolve(candRoot, ...segments);
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return null;
}

const config = {
  /* c8 ignore next */
  version: process.env.npm_package_version ?? '0.0.0',
  log: {
    level: env.LOG_LEVEL,
  },
  server: {
    cookiePrefix: env.COOKIE_PREFIX,
    secretKey: env.BETTER_AUTH_SECRET,
    host: env.HOST,
    port: env.PORT,
    frontendUrl: env.FRONTEND_URL,
    uploadsUrl: process.env.NODE_ENV === 'development' ?
      `${env.PROTOCOL}://${env.HOST === '0.0.0.0' ? '127.0.0.1' : env.HOST}:${env.PORT}/uploads`.replace(/([^:]\/)\/+/g, "$1") :
      (env.FRONTEND_URL.startsWith('http') ?
        `${env.FRONTEND_URL}/uploads`.replace(/([^:]\/)\/+/g, "$1") :
        `${env.PROTOCOL}://${env.FRONTEND_URL}/uploads`.replace(/([^:]\/)\/+/g, "$1")),
    baseUrl: env.BASE_URL ?
      env.BASE_URL.replace(/([^:]\/)\/+/g, "$1") :
      (process.env.NODE_ENV === 'development' ?
        `${env.PROTOCOL}://${env.HOST === '0.0.0.0' ? '127.0.0.1' : env.HOST}:${env.PORT}`.replace(/([^:]\/)\/+/g, "$1") :
        (env.FRONTEND_URL.startsWith('http') ?
          env.FRONTEND_URL.replace(/([^:]\/)\/+/g, "$1") :
          `${env.PROTOCOL}://${env.FRONTEND_URL}`.replace(/([^:]\/)\/+/g, "$1"))),
    uploadsUserDir: 'users',
    uploadsReportDir: 'reports',
    uploadsCsmsDir: 'csms',
    uploadsEmployeesDir: 'employees',
    uploadsAttendanceDir: 'attendance',
    uploadSmartCardDir: 'smartcards',
    chromePath: env.CHROME_PATH,
    trustedOrigins: [
      env.FRONTEND_URL.startsWith('http') ? env.FRONTEND_URL : `${env.PROTOCOL}://${env.FRONTEND_URL}`,
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      `${env.PROTOCOL}://${env.HOST}:${env.PORT}`,
    ].filter((origin, index, self): origin is string => Boolean(origin) && self.indexOf(origin) === index),
  },
  email: {
    brevo: {
      apiKey: env.BREVO_API_KEY,
    },
    fromAddress: env.EMAIL_FROM_ADDRESS,
    fromName: env.EMAIL_FROM_NAME,
  },
  db: {
    url: `postgres://${env.POSTGRES_USER}:${env.POSTGRES_PASSWORD}@${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}?sslmode=disable`,
  },
  marine: {
    hoursPobPheOses: env.MARINE_HOURS_POB_PHE_OSES,
    hoursPobContractor: env.MARINE_HOURS_POB_CONTRACTOR,
  },
  csmsAi: {
    serviceUrl: env.CSMS_AI_SERVICE_URL,
  },
};

export default config;
