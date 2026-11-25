-- ============================================
-- POB EMPLOYEE STATUS UPDATE - PT Pelayaran Ekanuri Indra Pratama
-- Update current_cycle_start_date to match POB start dates
-- ============================================

-- 1. Ahmad Shokib (POB Start: 16-Dec-25, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2025-12-16',
  last_check_in = '2025-12-16 00:00:00',
  updated_at = NOW()
WHERE employee_id = '50b3a248-6c81-4654-8da9-646ad069b50a';

UPDATE attendance 
SET 
  attendance_date = '2025-12-16',
  updated_at = NOW()
WHERE employee_id = '50b3a248-6c81-4654-8da9-646ad069b50a';

-- 2. Ibrahim Ratuloli (POB Start: 27-Jan-26, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2026-01-27',
  last_check_in = '2026-01-27 00:00:00',
  updated_at = NOW()
WHERE employee_id = '2e5f6e80-80cd-498c-aa54-85ccc1f68d19';

UPDATE attendance 
SET 
  attendance_date = '2026-01-27',
  updated_at = NOW()
WHERE employee_id = '2e5f6e80-80cd-498c-aa54-85ccc1f68d19';

-- 3. Bambang Supratman (POB Start: 03-Feb-26, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2026-02-03',
  last_check_in = '2026-02-03 00:00:00',
  updated_at = NOW()
WHERE employee_id = '5f471d9c-0a09-4af8-9842-278a62ea6080';

UPDATE attendance 
SET 
  attendance_date = '2026-02-03',
  updated_at = NOW()
WHERE employee_id = '5f471d9c-0a09-4af8-9842-278a62ea6080';

-- 4. Nanda Sukma Jati (POB Start: 16-Dec-25, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2025-12-16',
  last_check_in = '2025-12-16 00:00:00',
  updated_at = NOW()
WHERE employee_id = 'acff048c-9542-4fc2-94c8-499b070813e2';

UPDATE attendance 
SET 
  attendance_date = '2025-12-16',
  updated_at = NOW()
WHERE employee_id = 'acff048c-9542-4fc2-94c8-499b070813e2';

-- 5. Sugito (POB Start: 30-Dec-25, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2025-12-30',
  last_check_in = '2025-12-30 00:00:00',
  updated_at = NOW()
WHERE employee_id = '50326144-03c2-4e60-8850-7769ac55ff78';

UPDATE attendance 
SET 
  attendance_date = '2025-12-30',
  updated_at = NOW()
WHERE employee_id = '50326144-03c2-4e60-8850-7769ac55ff78';

-- 6. Tarmidi (POB Start: 03-Feb-26, Current: 06-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2026-02-03',
  last_check_in = '2026-02-03 00:00:00',
  updated_at = NOW()
WHERE employee_id = 'd08da0da-d878-403c-be3f-5589ddc9da5f';

UPDATE attendance 
SET 
  attendance_date = '2026-02-03',
  updated_at = NOW()
WHERE employee_id = 'd08da0da-d878-403c-be3f-5589ddc9da5f';

-- 7. Andi Lala Saputra (POB Start: 16-Dec-25, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2025-12-16',
  last_check_in = '2025-12-16 00:00:00',
  updated_at = NOW()
WHERE employee_id = 'ee0d602b-587d-436e-a75c-f9881f38a043';

UPDATE attendance 
SET 
  attendance_date = '2025-12-16',
  updated_at = NOW()
WHERE employee_id = 'ee0d602b-587d-436e-a75c-f9881f38a043';

-- 8. Syahril (POB Start: 13-Jan-26, Current: 04-Feb-26)
UPDATE employee_status 
SET 
  current_cycle_start_date = '2026-01-13',
  last_check_in = '2026-01-13 00:00:00',
  updated_at = NOW()
WHERE employee_id = '6bc64cae-881f-48db-8596-e52971891756';

UPDATE attendance 
SET 
  attendance_date = '2026-01-13',
  updated_at = NOW()
WHERE employee_id = '6bc64cae-881f-48db-8596-e52971891756';

