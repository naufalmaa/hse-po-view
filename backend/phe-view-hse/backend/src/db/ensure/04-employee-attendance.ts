import type pg from 'pg';

async function getExistingColumns(client: pg.PoolClient | pg.Pool, tableName: string): Promise<Set<string>> {
  const res = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1;`,
    [tableName]
  );
  return new Set(res.rows.map((r: any) => r.column_name));
}

export async function ensureEmployeeAttendanceSchema(client: pg.PoolClient | pg.Pool): Promise<void> {
  // Pre-create table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS employees (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sub_contractor_id UUID NOT NULL REFERENCES sub_contractors(id),
      category TEXT,
      employee_name TEXT,
      date_of_birth DATE,
      position TEXT,
      image TEXT,
      vessel_id UUID REFERENCES vessels(id),
      project_id UUID REFERENCES subtypes(id),
      project_name TEXT,
      location TEXT,
      identity_number TEXT,
      hsse_passport_number TEXT UNIQUE,
      status_on_duty BOOLEAN DEFAULT false,
      link_data_employee TEXT,
      verified_by TEXT,
      verified_date DATE,
      remarks TEXT,
      other_health_assurance TEXT,
      ppe TEXT,
      validation_status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // Only alter table if columns are actually missing
  const empCols = await getExistingColumns(client, 'employees');
  const empMissing: string[] = [];
  if (!empCols.has('location')) empMissing.push('ADD COLUMN location TEXT');
  if (!empCols.has('status_on_duty')) empMissing.push('ADD COLUMN status_on_duty BOOLEAN DEFAULT false');
  if (!empCols.has('vessel_id')) empMissing.push('ADD COLUMN vessel_id UUID REFERENCES vessels(id)');
  if (!empCols.has('project_id')) empMissing.push('ADD COLUMN project_id UUID REFERENCES subtypes(id)');
  if (!empCols.has('project_name')) empMissing.push('ADD COLUMN project_name TEXT');
  if (!empCols.has('validation_status')) empMissing.push("ADD COLUMN validation_status TEXT DEFAULT 'pending'");
  if (empMissing.length > 0) {
    await client.query(`ALTER TABLE employees ${empMissing.join(', ')};`);
  }

  await client.query(`
    DO $$ 
    BEGIN 
      -- 2. employee_bpjs
      CREATE TABLE IF NOT EXISTS employee_bpjs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        bpjs_employment TEXT,
        bpjs_health TEXT
      );

      -- 3. employee_contracts
      CREATE TABLE IF NOT EXISTS employee_contracts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        contract_code TEXT,
        expired_date DATE,
        expired_date_company DATE
      );

      -- 4. employee_vaccinations
      CREATE TABLE IF NOT EXISTS employee_vaccinations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        vaccine_date DATE,
        vaccine_status TEXT
      );

      -- 5. employee_mcus
      CREATE TABLE IF NOT EXISTS employee_mcus (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        mcu_date DATE,
        mcu_expired_date DATE,
        mcu_hospital_name TEXT,
        mcu_deviation_notes TEXT,
        mcu_follow_up TEXT,
        ohih_review TEXT,
        status_kelaikan_bekerja TEXT,
        skj_score TEXT
      );

      -- 6. employee_certificates
      CREATE TABLE IF NOT EXISTS employee_certificates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        name TEXT,
        expired_date DATE,
        is_permanent BOOLEAN DEFAULT false,
        status VARCHAR(255),
        last_validated_at TIMESTAMPTZ
      );

      -- 7. employee_sika
      CREATE TABLE IF NOT EXISTS employee_sika (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        type TEXT,
        status TEXT,
        expired_date DATE
      );

      -- 8. employee_files
      CREATE TABLE IF NOT EXISTS employee_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        contract_id UUID REFERENCES employee_contracts(id),
        mcu_id UUID REFERENCES employee_mcus(id),
        bpjs_id UUID REFERENCES employee_bpjs(id),
        vaccination_id UUID REFERENCES employee_vaccinations(id),
        certificate_id UUID REFERENCES employee_certificates(id),
        sika_id UUID REFERENCES employee_sika(id),
        type TEXT,
        file_name TEXT,
        file_path TEXT,
        file_type TEXT,
        uploaded_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 9. employee_alarm_log
      CREATE TABLE IF NOT EXISTS employee_alarm_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id),
        type TEXT,
        message TEXT,
        status TEXT,
        triggered_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 10. employee_status
      CREATE TABLE IF NOT EXISTS employee_status (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) UNIQUE,
        is_on_duty BOOLEAN DEFAULT false,
        last_check_in TIMESTAMPTZ,
        last_check_out TIMESTAMPTZ,
        current_cycle_start_date DATE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 11. attendance (Absensi)
      CREATE TABLE IF NOT EXISTS attendance (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id),
        attendance_date DATE NOT NULL,
        status_after TEXT NOT NULL,
        work_location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,
        photo_evidence TEXT,
        notes TEXT,
        position JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'work_location_id'
      ) THEN
        ALTER TABLE attendance ADD COLUMN work_location_id UUID;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'attendance' AND column_name = 'position'
      ) THEN
        ALTER TABLE attendance ADD COLUMN position JSONB;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'attendance_work_location_id_fkey') THEN
        BEGIN
          ALTER TABLE attendance ADD CONSTRAINT attendance_work_location_id_fkey 
            FOREIGN KEY (work_location_id) REFERENCES work_locations(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
      END IF;

      -- 12. smart_card_observations
      CREATE TABLE IF NOT EXISTS smart_card_observations (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        employee_id UUID NOT NULL REFERENCES employees(id),
        observation_date DATE,
        observation_time TEXT,
        observation_function TEXT,
        observation_area TEXT,
        specific_location TEXT,
        report_category TEXT,
        observed_behavior TEXT,
        observed_aspect_category TEXT,
        worker TEXT,
        ppe_type_observed TEXT,
        unsafe_ppe_cause TEXT,
        equipment_tools TEXT,
        material TEXT,
        procedures_admin_control TEXT,
        work_environment TEXT,
        unsafe_behavior_description TEXT,
        agreed_follow_up TEXT,
        clsr TEXT,
        stop_work_authority BOOLEAN,
        current_intervention_status TEXT,
        finding_description TEXT,
        root_cause TEXT,
        potential_impact TEXT,
        current_handling TEXT,
        follow_up_handling TEXT,
        follow_up_priority TEXT,
        responsible_person TEXT,
        uc_finding_status TEXT,
        what TEXT,
        who TEXT,
        how TEXT,
        near_miss_handling TEXT,
        near_miss_category TEXT,
        near_miss_potential_impact TEXT,
        additional_notes TEXT,
        clsr2 TEXT,
        current_near_miss_status TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 13. upload_history
      CREATE TABLE IF NOT EXISTS upload_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        filename TEXT NOT NULL,
        status TEXT NOT NULL,
        total_rows INTEGER,
        valid_rows INTEGER,
        error_rows INTEGER,
        skipped_rows INTEGER,
        inserted_rows INTEGER,
        first_id INTEGER,
        last_id INTEGER,
        error_message TEXT,
        has_errors BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 14. upload_observation_errors
      CREATE TABLE IF NOT EXISTS upload_observation_errors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        upload_history_id UUID REFERENCES upload_history(id) ON DELETE CASCADE,
        original_row TEXT,
        error_type TEXT,
        suggestions TEXT,
        status TEXT DEFAULT 'error',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- 15. pob_unmatched_logs
      CREATE TABLE IF NOT EXISTS pob_unmatched_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        unmatched_count INTEGER DEFAULT 0,
        filename TEXT,
        data JSONB
      );
    END $$;
  `);

  // Synchronize employees.project_name with subtypes.name
  await client.query(`
    UPDATE employees e
    SET project_name = s.name
    FROM subtypes s
    WHERE e.project_id = s.id
      AND (e.project_name IS NULL OR e.project_name <> s.name);

    UPDATE employees e
    SET project_id = s.id
    FROM subtypes s
    WHERE e.project_id IS NULL
      AND e.project_name IS NOT NULL
      AND LOWER(TRIM(e.project_name)) = LOWER(TRIM(s.name));
  `);
}
