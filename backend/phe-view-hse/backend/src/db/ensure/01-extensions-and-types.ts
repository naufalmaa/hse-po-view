import type pg from 'pg';

export async function ensureExtensionsAndTypes(client: pg.PoolClient | pg.Pool): Promise<{ hasVector: boolean }> {
  // 1. Extensions
  await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);
  await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "ltree";`);
  } catch (err: any) {
    console.warn('[DB Auto-Ensure] Warning: Could not enable extension "ltree".', err?.message || err);
  }

  let hasVector = false;
  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "vector";`);
    hasVector = true;
  } catch (err: any) {
    console.warn('[DB Auto-Ensure] Warning: Extension "vector" (pgvector) is not available on this PostgreSQL server. Vector embeddings in CSMS will be skipped until pgvector is installed.');
  }

  // 2. Custom ENUM Types
  await client.query(`
    DO $$ 
    BEGIN 
      -- Enum: UserRole
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserRole') THEN
        CREATE TYPE "UserRole" AS ENUM ('admin', 'user', 'evaluator', 'verifikator', 'manager', 'contractor', 'crew', 'employee');
      ELSE
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'admin'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'user'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'evaluator'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'verifikator'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'manager'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'contractor'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'crew'; EXCEPTION WHEN duplicate_object THEN NULL; END;
        BEGIN ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'employee'; EXCEPTION WHEN duplicate_object THEN NULL; END;
      END IF;

      -- Enum: StatusContractEnum
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StatusContractEnum') THEN
        CREATE TYPE "StatusContractEnum" AS ENUM ('pending', 'accept', 'reject', 'revision');
      END IF;
    END $$;
  `);

  return { hasVector };
}
