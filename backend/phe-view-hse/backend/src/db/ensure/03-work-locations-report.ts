import type pg from 'pg';

export async function ensureWorkLocationsAndReportSchema(client: pg.PoolClient | pg.Pool): Promise<void> {
  // 1. Diagnostic inspection & data type harmonization for subtypes
  try {
    const subtypeCols = await client.query(`
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'subtypes';
    `);
    console.log('[DB Auto-Ensure] subtypes columns:', JSON.stringify(subtypeCols.rows));

    if (subtypeCols.rows.length > 0) {
      // Add extra column if missing
      const hasExtra = subtypeCols.rows.some((c: any) => c.column_name === 'extra');
      if (!hasExtra) {
        console.log('[DB Auto-Ensure] Adding missing "extra" column to subtypes...');
        await client.query('ALTER TABLE subtypes ADD COLUMN extra JSONB;');
      }

      const idCol = subtypeCols.rows.find((c: any) => c.column_name === 'id');
      if (idCol) {
        if (idCol.udt_name !== 'uuid') {
          console.log(`[DB Auto-Ensure] Migrating subtypes.id type from "${idCol.udt_name}" to "uuid"...`);
          await client.query(`
            ALTER TABLE subtypes ALTER COLUMN id TYPE uuid USING id::uuid;
          `);
        }

        // Clean duplicate IDs if any exist in subtypes
        const dupIdRes = await client.query(`
          SELECT id, COUNT(*) as count 
          FROM subtypes 
          WHERE id IS NOT NULL 
          GROUP BY id 
          HAVING COUNT(*) > 1;
        `);
        if (dupIdRes.rows.length > 0) {
          console.log('[DB Auto-Ensure] Found duplicate IDs in subtypes:', JSON.stringify(dupIdRes.rows));
          await client.query(`
            DELETE FROM subtypes a USING subtypes b
            WHERE a.ctid < b.ctid AND a.id = b.id;
          `);
          console.log('[DB Auto-Ensure] Cleaned duplicate IDs in subtypes.');
        }

        // Only alter column to NOT NULL if nullable
        if (idCol.is_nullable === 'YES') {
          await client.query(`
            UPDATE subtypes SET id = gen_random_uuid() WHERE id IS NULL;
            ALTER TABLE subtypes ALTER COLUMN id SET NOT NULL;
          `);
        }

        // Only set default if missing
        if (!idCol.column_default) {
          await client.query(`
            ALTER TABLE subtypes ALTER COLUMN id SET DEFAULT gen_random_uuid();
          `);
        }
      }

      // Check PRIMARY KEY specifically on subtypes(id)
      const pkCheck = await client.query(`
        SELECT c.conname, a.attname
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = 'public.subtypes'::regclass 
          AND c.contype = 'p'
          AND a.attname = 'id';
      `);

      if (pkCheck.rows.length === 0) {
        console.log('[DB Auto-Ensure] Table subtypes has no PRIMARY KEY on id. Adding PRIMARY KEY (id)...');
        const otherPk = await client.query(`
          SELECT conname FROM pg_constraint 
          WHERE conrelid = 'public.subtypes'::regclass AND contype = 'p';
        `);
        for (const row of otherPk.rows) {
          console.log(`[DB Auto-Ensure] Dropping old PK "${row.conname}"...`);
          await client.query(`ALTER TABLE subtypes DROP CONSTRAINT "${row.conname}";`);
        }

        await client.query(`ALTER TABLE subtypes ADD PRIMARY KEY (id);`);
        console.log('[DB Auto-Ensure] PRIMARY KEY (id) added successfully to subtypes.');
      }
    }
  } catch (err) {
    console.warn('[DB Auto-Ensure] Note during subtypes pre-check:', err);
  }

  try {
    await client.query(`
    DO $$ 
    DECLARE
      r_dup_name RECORD;
      r_dup_row RECORD;
      v_canonical_id UUID;
    BEGIN 
      -- 1. subtypes (projects / categories)
      CREATE TABLE IF NOT EXISTS subtypes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(150) NOT NULL,
        extra JSONB
      );

      -- Deduplicate subtypes by name if any duplicates exist before creating unique constraint
      FOR r_dup_name IN (
        SELECT name FROM subtypes GROUP BY name HAVING COUNT(*) > 1
      ) LOOP
        -- Select canonical ID: prioritize fixed officeProjectId if present, otherwise lowest UUID
        SELECT id INTO v_canonical_id
        FROM subtypes
        WHERE name = r_dup_name.name
        ORDER BY CASE WHEN id = '207f16d1-cbfa-43a1-bc3f-c7cbea400755' THEN 0 ELSE 1 END, id ASC
        LIMIT 1;

        FOR r_dup_row IN (
          SELECT id, extra FROM subtypes WHERE name = r_dup_name.name AND id <> v_canonical_id
        ) LOOP
          -- Preserve extra metadata if canonical row lacked it
          UPDATE subtypes
          SET extra = COALESCE(subtypes.extra, r_dup_row.extra)
          WHERE id = v_canonical_id AND subtypes.extra IS NULL AND r_dup_row.extra IS NOT NULL;

          -- Repoint work_locations if table exists
          IF to_regclass('public.work_locations') IS NOT NULL THEN
            EXECUTE '
              DELETE FROM work_locations wl
              WHERE wl.project_id = $1
                AND EXISTS (
                  SELECT 1 FROM work_locations wl2
                  WHERE wl2.project_id = $2 AND wl2.name = wl.name
                )
            ' USING r_dup_row.id, v_canonical_id;

            EXECUTE '
              UPDATE work_locations SET project_id = $1 WHERE project_id = $2
            ' USING v_canonical_id, r_dup_row.id;
          END IF;

          -- Repoint daily_report_subtypes if table exists
          IF to_regclass('public.daily_report_subtypes') IS NOT NULL THEN
            EXECUTE '
              DELETE FROM daily_report_subtypes drs
              WHERE drs.subtype_id = $1
                AND EXISTS (
                  SELECT 1 FROM daily_report_subtypes drs2
                  WHERE drs2.report_id = drs.report_id AND drs2.subtype_id = $2
                )
            ' USING r_dup_row.id, v_canonical_id;

            EXECUTE '
              UPDATE daily_report_subtypes SET subtype_id = $1 WHERE subtype_id = $2
            ' USING v_canonical_id, r_dup_row.id;
          END IF;

          -- Repoint employees if table exists
          IF to_regclass('public.employees') IS NOT NULL THEN
            EXECUTE '
              UPDATE employees SET project_id = $1 WHERE project_id = $2
            ' USING v_canonical_id, r_dup_row.id;
          END IF;

          -- Repoint log_manhours if table exists
          IF to_regclass('public.log_manhours') IS NOT NULL THEN
            EXECUTE '
              DELETE FROM log_manhours lm
              WHERE lm.project_id = $1
                AND EXISTS (
                  SELECT 1 FROM log_manhours lm2
                  WHERE lm2.log_date = lm.log_date
                    AND lm2.project_id = $2
                    AND (lm2.work_location_id IS NOT DISTINCT FROM lm.work_location_id)
                )
            ' USING r_dup_row.id, v_canonical_id;

            EXECUTE '
              UPDATE log_manhours SET project_id = $1 WHERE project_id = $2
            ' USING v_canonical_id, r_dup_row.id;
          END IF;

          -- Finally remove the duplicate subtype row
          DELETE FROM subtypes WHERE id = r_dup_row.id;
        END LOOP;
      END LOOP;

      -- Safely add unique constraint
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subtypesNameKey') THEN
        BEGIN
          ALTER TABLE subtypes ADD CONSTRAINT "subtypesNameKey" UNIQUE (name);
        EXCEPTION
          WHEN duplicate_object OR duplicate_table THEN NULL;
          WHEN unique_violation THEN
            RAISE WARNING '[DB Auto-Ensure] Could not add constraint subtypesNameKey: duplicate values remain in subtypes.';
        END;
      END IF;

      -- 2. work_locations (NEW table under project)
      CREATE TABLE IF NOT EXISTS work_locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID NOT NULL REFERENCES subtypes(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL,
        latitude VARCHAR(50),
        longitude VARCHAR(50),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'work_locations_project_name_unique') THEN
        BEGIN
          ALTER TABLE work_locations ADD CONSTRAINT work_locations_project_name_unique UNIQUE (project_id, name);
        EXCEPTION
          WHEN duplicate_object OR duplicate_table THEN NULL;
          WHEN unique_violation THEN
            RAISE WARNING '[DB Auto-Ensure] Could not add constraint work_locations_project_name_unique: duplicate values remain in work_locations.';
        END;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.work_locations'::regclass AND contype = 'p') THEN
        BEGIN ALTER TABLE work_locations ADD PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END;
      END IF;

      -- 3. daily_reports
      CREATE TABLE IF NOT EXISTS daily_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_date DATE NOT NULL,
        reported_by VARCHAR(100) NOT NULL,
        instansi VARCHAR(100) NOT NULL,
        form_type VARCHAR(50) NOT NULL,
        work_location_id UUID REFERENCES work_locations(id) ON DELETE SET NULL,
        created_by_user_id UUID NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.daily_reports'::regclass AND contype = 'p') THEN
        BEGIN ALTER TABLE daily_reports ADD PRIMARY KEY (id); EXCEPTION WHEN others THEN NULL; END;
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'daily_reports' AND column_name = 'work_location_id'
      ) THEN
        ALTER TABLE daily_reports ADD COLUMN work_location_id UUID;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'daily_reports_work_location_id_fkey') THEN
        BEGIN
          ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_work_location_id_fkey 
            FOREIGN KEY (work_location_id) REFERENCES work_locations(id) ON DELETE SET NULL;
        EXCEPTION WHEN duplicate_object THEN NULL;
        END;
      END IF;

      -- 4. daily_report_subtypes
      CREATE TABLE IF NOT EXISTS daily_report_subtypes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        subtype_id UUID NOT NULL REFERENCES subtypes(id) ON DELETE CASCADE
      );

      -- 5. report_lagging_indicators
      CREATE TABLE IF NOT EXISTS report_lagging_indicators (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        description TEXT,
        status_free_lta_ri BOOLEAN,
        free_lta_days INTEGER,
        free_ri_days INTEGER,
        recordable_incident INTEGER,
        non_recordable_incident INTEGER,
        fatality INTEGER,
        lti INTEGER,
        restricted_work_day_case INTEGER,
        medical_treatment_case INTEGER,
        first_aid INTEGER,
        near_miss INTEGER,
        unsafe_action INTEGER,
        unsafe_condition INTEGER,
        environmental_damage INTEGER,
        property_damage INTEGER
      );

      -- 6. report_manhours
      CREATE TABLE IF NOT EXISTS report_manhours (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        pob_phe_oses INTEGER,
        pob_contractor INTEGER,
        hours_pob_phe_oses INTEGER,
        hours_pob_contractor INTEGER
      );

      -- 7. report_meetings
      CREATE TABLE IF NOT EXISTS report_meetings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        meeting_description TEXT,
        jenis_meeting TEXT,
        absence_percentage INTEGER,
        toolbox_meeting INTEGER,
        tool_box_talk INTEGER,
        general_safety_meeting INTEGER,
        safety_committee_meeting INTEGER,
        pre_job_safety_meeting INTEGER,
        monthly_safety_meeting INTEGER,
        hsse_site_orientation_meeting INTEGER,
        marine_contractor_meeting INTEGER,
        safety_stand_down_meeting INTEGER,
        management_visit INTEGER,
        marine_safety_campaign INTEGER,
        learning_from_campaign_event INTEGER,
        others_meeting INTEGER
      );

      -- 8. report_drills
      CREATE TABLE IF NOT EXISTS report_drills (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        drill_description TEXT,
        total_participants INTEGER,
        fire_drill INTEGER,
        abandon_drill INTEGER,
        mustering_drill INTEGER,
        medievac_drill INTEGER,
        h2s_drill INTEGER,
        oil_pollution_prevention_drill INTEGER,
        steering_gear_failure_drill INTEGER,
        man_overboard_drill INTEGER,
        grounding_drill INTEGER,
        first_aid_drill INTEGER,
        collision_drill INTEGER,
        dry_drill INTEGER,
        wet_drill INTEGER,
        others_drill INTEGER
      );

      -- 9. report_trainings
      CREATE TABLE IF NOT EXISTS report_trainings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        training_description TEXT,
        total_participants INTEGER,
        clsr INTEGER,
        akhlak INTEGER,
        unsafe_action_category INTEGER,
        sika INTEGER,
        l2ra INTEGER,
        pre_site_induction INTEGER,
        site_induction INTEGER,
        shipboard_training INTEGER,
        others_training INTEGER
      );

      -- 10. report_inspections
      CREATE TABLE IF NOT EXISTS report_inspections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        description TEXT,
        open_finding INTEGER,
        close_finding INTEGER,
        outstanding_finding INTEGER,
        no_issue INTEGER,
        lsa_inspection INTEGER,
        ffa_inspection INTEGER,
        ppe_inspection INTEGER,
        other_inspection INTEGER,
        follow_up TEXT,
        deadline DATE,
        finding TEXT,
        inspection INTEGER
      );

      -- 11. report_smart_cards
      CREATE TABLE IF NOT EXISTS report_smart_cards (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        kartu_pintar_description TEXT,
        unsafe_action INTEGER,
        unsafe_condition INTEGER,
        nearmiss INTEGER,
        process_safety INTEGER,
        non_participants JSONB DEFAULT '[]'::jsonb
      );
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'report_smart_cards' AND column_name = 'non_participants'
      ) THEN
        ALTER TABLE report_smart_cards ADD COLUMN non_participants JSONB DEFAULT '[]'::jsonb;
      END IF;

      -- 12. report_permits
      CREATE TABLE IF NOT EXISTS report_permits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        permit_to_work_description TEXT,
        open_date DATE,
        no_ptw VARCHAR(100),
        location TEXT,
        ra_jsa TEXT,
        performing_authority TEXT,
        site_controller TEXT,
        general_work INTEGER,
        breaking_containment INTEGER,
        hot_work INTEGER,
        critical_work INTEGER,
        confined_space INTEGER,
        cwp_l1 INTEGER,
        hwsp_l1 INTEGER,
        confined_space_1 INTEGER,
        cwp_l2 INTEGER,
        hwsp_l2 INTEGER,
        confined_space_2 INTEGER,
        isolation_confirmation_certificate INTEGER
      );

      -- 13. report_highlights
      CREATE TABLE IF NOT EXISTS report_highlights (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        daily_activities TEXT,
        daily_next_plan TEXT,
        weather TEXT,
        overstay_personnel JSONB DEFAULT '[]'::jsonb
      );
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'report_highlights' AND column_name = 'overstay_personnel'
      ) THEN
        ALTER TABLE report_highlights ADD COLUMN overstay_personnel JSONB DEFAULT '[]'::jsonb;
      END IF;

      -- 14. report_weather_sealevel
      CREATE TABLE IF NOT EXISTS report_weather_sealevel (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        region_weather JSONB,
        region_sealevel JSONB,
        trigger_at TIMESTAMPTZ NOT NULL
      );

      -- 15. report_operations
      CREATE TABLE IF NOT EXISTS report_operations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        region VARCHAR(10) NOT NULL,
        current_hi_po_activity TEXT,
        forecast_hi_po_activity TEXT,
        wind_speed TEXT,
        sea_level TEXT,
        sky_condition TEXT,
        pitching_rolling TEXT
      );

      -- 16. report_vessels_under_po_summary
      CREATE TABLE IF NOT EXISTS report_vessels_under_po_summary (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        total_boat_today INTEGER,
        total_boat_monthly INTEGER,
        total_boat_ytd INTEGER,
        total_employee_today INTEGER,
        total_employee_monthly INTEGER,
        total_employee_ytd INTEGER
      );

      -- 17. report_files
      CREATE TABLE IF NOT EXISTS report_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        report_id UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
        inspection_id UUID REFERENCES report_inspections(id) ON DELETE CASCADE,
        meeting_id UUID REFERENCES report_meetings(id) ON DELETE CASCADE,
        drill_id UUID REFERENCES report_drills(id) ON DELETE CASCADE,
        training_id UUID REFERENCES report_trainings(id) ON DELETE CASCADE,
        permit_id UUID REFERENCES report_permits(id) ON DELETE CASCADE,
        file_name VARCHAR(255) NOT NULL,
        file_type VARCHAR(255) NOT NULL,
        file_path TEXT NOT NULL,
        section VARCHAR(100),
        note TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 18. Initialize default values for subtypes.extra (hours and autoCalculateManhours)
      UPDATE subtypes
      SET extra = jsonb_set(
        COALESCE(extra, '{}'::jsonb),
        '{hoursPobPheOses}',
        COALESCE(extra->'hoursPobPheOses', '12'::jsonb)
      )
      WHERE extra IS NULL OR extra->'hoursPobPheOses' IS NULL;

      UPDATE subtypes
      SET extra = jsonb_set(
        COALESCE(extra, '{}'::jsonb),
        '{hoursPobContractor}',
        COALESCE(extra->'hoursPobContractor', '12'::jsonb)
      )
      WHERE extra IS NULL OR extra->'hoursPobContractor' IS NULL;

      -- Set autoCalculateManhours = false for older/inactive projects (last report <= 2025-12-31 or no reports in last 6 months)
      UPDATE subtypes s
      SET extra = jsonb_set(
        COALESCE(s.extra, '{}'::jsonb),
        '{autoCalculateManhours}',
        'false'::jsonb
      )
      WHERE s.id IN (
        SELECT s2.id
        FROM subtypes s2
        LEFT JOIN daily_report_subtypes drs ON drs.subtype_id = s2.id
        LEFT JOIN daily_reports dr ON dr.id = drs.report_id
        GROUP BY s2.id
        HAVING MAX(dr.report_date) <= '2025-12-31'
           OR MAX(dr.report_date) < (CURRENT_DATE - INTERVAL '6 months')
           OR MAX(dr.report_date) IS NULL
      );

      -- Set autoCalculateManhours = true for active projects if unset
      UPDATE subtypes s
      SET extra = jsonb_set(
        COALESCE(s.extra, '{}'::jsonb),
        '{autoCalculateManhours}',
        'true'::jsonb
      )
      WHERE (s.extra IS NULL OR s.extra->'autoCalculateManhours' IS NULL);
    END $$;
  `);
  } catch (err: any) {
    if (err.code === '55P03') {
      console.warn('[DB Auto-Ensure] Notice: lock_timeout during work locations & report schema synchronization. Checking if essential tables already exist...');
      const checkTables = await client.query(`
        SELECT COUNT(*) as count FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name IN ('subtypes', 'daily_reports', 'work_locations');
      `);
      if (parseInt(checkTables.rows[0]?.count || '0', 10) >= 3) {
        console.log('[DB Auto-Ensure] Essential tables already exist and are intact. Continuing startup safely.');
        return;
      }
    }
    throw err;
  }
}
