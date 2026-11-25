import type pg from 'pg';

async function tableExists(client: pg.PoolClient | pg.Pool, tableName: string): Promise<boolean> {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1;`,
    [tableName]
  );
  return res.rows.length > 0;
}

async function getExistingColumns(client: pg.PoolClient | pg.Pool, tableName: string): Promise<Set<string>> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`,
    [tableName]
  );
  return new Set(res.rows.map((r: any) => r.column_name));
}

async function hasPrimaryKey(client: pg.PoolClient | pg.Pool, tableName: string): Promise<boolean> {
  const res = await client.query(`
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = to_regclass('public.' || $1) AND contype = 'p';
  `, [tableName]);
  return res.rows.length > 0;
}

export async function ensureAuthCoreSchema(client: pg.PoolClient | pg.Pool): Promise<void> {
  // 1. sub_contractors
  if (!await tableExists(client, 'sub_contractors')) {
    await client.query(`
      CREATE TABLE sub_contractors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        category VARCHAR(255)
      );
    `);
  } else if (!await hasPrimaryKey(client, 'sub_contractors')) {
    await client.query(`
      DO $$
      BEGIN
        BEGIN ALTER TABLE sub_contractors ADD PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END;
      END $$;
    `);
  }

  // 2. vessels
  if (!await tableExists(client, 'vessels')) {
    await client.query(`
      CREATE TABLE vessels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        vessel_name TEXT NOT NULL,
        type VARCHAR(255),
        status BOOLEAN NOT NULL DEFAULT true,
        personnel_count INTEGER,
        extra JSONB
      );
    `);
  } else {
    const vesselCols = await getExistingColumns(client, 'vessels');
    if (!vesselCols.has('extra')) {
      await client.query(`ALTER TABLE vessels ADD COLUMN extra JSONB;`);
    }
    if (!await hasPrimaryKey(client, 'vessels')) {
      await client.query(`
        DO $$
        BEGIN
          BEGIN ALTER TABLE vessels ADD PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END;
        END $$;
      `);
    }
  }

  // 3. locations (master locations)
  if (!await tableExists(client, 'locations')) {
    await client.query(`
      CREATE TABLE locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        description TEXT,
        geometry TEXT,
        status BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  // 4. users
  if (!await tableExists(client, 'users')) {
    await client.query(`
      CREATE TABLE users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(50) UNIQUE,
        hsse_passport_number TEXT UNIQUE,
        email_verified BOOLEAN NOT NULL DEFAULT false,
        name VARCHAR(50) NOT NULL,
        role "UserRole" NOT NULL DEFAULT 'user',
        image TEXT,
        signature TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        banned BOOLEAN NOT NULL DEFAULT false,
        ban_reason TEXT,
        ban_expires TIMESTAMPTZ
      );
    `);
  } else {
    const userCols = await getExistingColumns(client, 'users');
    const userMissing: string[] = [];
    if (!userCols.has('hsse_passport_number')) userMissing.push('ADD COLUMN hsse_passport_number TEXT');
    if (!userCols.has('signature')) userMissing.push('ADD COLUMN signature TEXT');
    if (!userCols.has('banned')) userMissing.push('ADD COLUMN banned BOOLEAN NOT NULL DEFAULT false');
    if (!userCols.has('ban_reason')) userMissing.push('ADD COLUMN ban_reason TEXT');
    if (!userCols.has('ban_expires')) userMissing.push('ADD COLUMN ban_expires TIMESTAMPTZ');
    if (userMissing.length > 0) {
      await client.query(`ALTER TABLE users ${userMissing.join(', ')};`);
    }
  }

  // 5. accounts
  if (!await tableExists(client, 'accounts')) {
    await client.query(`
      CREATE TABLE accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        account_id TEXT NOT NULL,
        provider_id TEXT NOT NULL,
        issuer TEXT,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        access_token TEXT,
        refresh_token TEXT,
        id_token TEXT,
        access_token_expires_at TIMESTAMPTZ,
        refresh_token_expires_at TIMESTAMPTZ,
        scope TEXT,
        password TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  } else {
    const accountCols = await getExistingColumns(client, 'accounts');
    if (!accountCols.has('issuer')) {
      await client.query(`ALTER TABLE accounts ADD COLUMN issuer TEXT;`);
      await client.query(`
        UPDATE accounts 
        SET issuer = 'local:credential' 
        WHERE provider_id = 'credential' AND (issuer IS NULL OR issuer = '');
      `);
    }
  }

  // 6. sessions
  if (!await tableExists(client, 'sessions')) {
    await client.query(`
      CREATE TABLE sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        expires_at TIMESTAMPTZ NOT NULL,
        token TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address TEXT,
        user_agent TEXT,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        impersonated_by UUID
      );
    `);
  }
  const indexCheck = await client.query(`
    SELECT indexname FROM pg_indexes 
    WHERE tablename = 'sessions' AND indexname IN ('idx_sessions_token', 'idx_sessions_user_id');
  `);
  const existingIndexes = new Set(indexCheck.rows.map((r: any) => r.indexname));
  if (!existingIndexes.has('idx_sessions_token')) {
    await client.query(`CREATE INDEX idx_sessions_token ON sessions(token);`);
  }
  if (!existingIndexes.has('idx_sessions_user_id')) {
    await client.query(`CREATE INDEX idx_sessions_user_id ON sessions(user_id);`);
  }

  // 7. verification
  if (!await tableExists(client, 'verification')) {
    await client.query(`
      CREATE TABLE verification (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier VARCHAR(255) NOT NULL,
        value VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }

  // 8. contractor_vessels, user_contractors, user_alarm_log
  if (!await tableExists(client, 'contractor_vessels')) {
    await client.query(`
      CREATE TABLE contractor_vessels (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        contractor_id UUID NOT NULL REFERENCES sub_contractors(id) ON DELETE CASCADE,
        vessel_id UUID NOT NULL REFERENCES vessels(id) ON DELETE CASCADE
      );
    `);
  }

  if (!await tableExists(client, 'user_contractors')) {
    await client.query(`
      CREATE TABLE user_contractors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contractor_id UUID NOT NULL REFERENCES sub_contractors(id) ON DELETE CASCADE,
        vessel_id UUID REFERENCES vessels(id) ON DELETE CASCADE
      );
    `);
  }

  if (!await tableExists(client, 'user_alarm_log')) {
    await client.query(`
      CREATE TABLE user_alarm_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        alarm_employee_id UUID,
        alarm_csms_id UUID,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
  }
}
