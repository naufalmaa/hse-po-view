# Kamus Data HSE Proview

Dihasilkan otomatis oleh `npx tsx scripts/gen-data-dictionary.ts` (backend) dari database yang skemanya disinkronkan oleh kode. Jumlah tabel: **62**. Jangan edit manual; ubah deskripsi di skrip lalu jalankan ulang.

Keterangan kolom: **PK** primary key, **FK** foreign key (tabel.kolom, aturan ON DELETE), **Null** boleh kosong.

## Tipe enum

| Enum | Nilai |
| --- | --- |
| `StatusContractEnum` | pending, accept, reject, revision |
| `UserRole` | admin, user, evaluator, verifikator, manager, contractor, crew, employee |

## Daftar tabel

| Domain | Tabel | Fungsi |
| --- | --- | --- |
| Autentikasi, pengguna, dan master data | [`users`](#users) | Pengguna aplikasi. Kolom `role` (enum UserRole) menentukan menu dan hak akses. |
| Autentikasi, pengguna, dan master data | [`accounts`](#accounts) | Kredensial login Better Auth per pengguna. `password` berisi hash scrypt (salt:key), bukan teks asli. |
| Autentikasi, pengguna, dan master data | [`sessions`](#sessions) | Sesi login aktif (token cookie), dengan IP dan user agent. |
| Autentikasi, pengguna, dan master data | [`verification`](#verification) | Token verifikasi Better Auth (reset password, verifikasi email). |
| Autentikasi, pengguna, dan master data | [`sub_contractors`](#sub_contractors) | Master perusahaan kontraktor. |
| Autentikasi, pengguna, dan master data | [`vessels`](#vessels) | Master kapal. |
| Autentikasi, pengguna, dan master data | [`contractor_vessels`](#contractor_vessels) | Relasi banyak-ke-banyak kontraktor dan kapal. |
| Autentikasi, pengguna, dan master data | [`user_contractors`](#user_contractors) | Pemetaan pengguna ke kontraktor/kapal yang boleh diakses. |
| Autentikasi, pengguna, dan master data | [`locations`](#locations) | Master lokasi (koordinat) untuk cuaca dan lokasi kerja. |
| Autentikasi, pengguna, dan master data | [`user_alarm_log`](#user_alarm_log) | Log notifikasi/alarm yang ditujukan ke pengguna. |
| Proyek dan laporan harian (Daily Report) | [`subtypes`](#subtypes) | Proyek / sub-tipe pekerjaan. Kolom `extra` (JSON) menyimpan pengaturan proyek, mis. autoCalculateManhours. |
| Proyek dan laporan harian (Daily Report) | [`work_locations`](#work_locations) | Lokasi kerja di bawah satu proyek. |
| Proyek dan laporan harian (Daily Report) | [`daily_reports`](#daily_reports) | Header laporan harian (tanggal, lokasi kerja, pembuat, status). |
| Proyek dan laporan harian (Daily Report) | [`daily_report_subtypes`](#daily_report_subtypes) | Relasi laporan harian ke proyek. |
| Proyek dan laporan harian (Daily Report) | [`report_manhours`](#report_manhours) | Jam kerja (manhours) pada laporan. |
| Proyek dan laporan harian (Daily Report) | [`report_lagging_indicators`](#report_lagging_indicators) | Indikator lagging HSE (insiden, kecelakaan, dsb.). |
| Proyek dan laporan harian (Daily Report) | [`report_highlights`](#report_highlights) | Sorotan / catatan penting laporan. |
| Proyek dan laporan harian (Daily Report) | [`report_meetings`](#report_meetings) | Kegiatan rapat / safety meeting. |
| Proyek dan laporan harian (Daily Report) | [`report_drills`](#report_drills) | Kegiatan drill / latihan keadaan darurat. |
| Proyek dan laporan harian (Daily Report) | [`report_trainings`](#report_trainings) | Kegiatan pelatihan. |
| Proyek dan laporan harian (Daily Report) | [`report_inspections`](#report_inspections) | Kegiatan inspeksi. |
| Proyek dan laporan harian (Daily Report) | [`report_smart_cards`](#report_smart_cards) | Ringkasan kartu pintar (observasi keselamatan) pada laporan. |
| Proyek dan laporan harian (Daily Report) | [`report_permits`](#report_permits) | Izin kerja (Permit to Work) pada laporan. |
| Proyek dan laporan harian (Daily Report) | [`report_operations`](#report_operations) | Ringkasan kegiatan operasi. |
| Proyek dan laporan harian (Daily Report) | [`report_vessels_under_po_summary`](#report_vessels_under_po_summary) | Ringkasan kapal di bawah PO. |
| Proyek dan laporan harian (Daily Report) | [`report_files`](#report_files) | Lampiran berkas laporan; terhubung ke detail (rapat, drill, pelatihan, inspeksi, izin). |
| Proyek dan laporan harian (Daily Report) | [`report_weather_sealevel`](#report_weather_sealevel) | Data cuaca dan tinggi muka laut harian (diisi job terjadwal). |
| Karyawan, absensi, dan kartu pintar | [`employees`](#employees) | Master karyawan (kontraktor, kapal, proyek). |
| Karyawan, absensi, dan kartu pintar | [`employee_status`](#employee_status) | Riwayat status siklus karyawan (on duty, off, dsb.). |
| Karyawan, absensi, dan kartu pintar | [`attendance`](#attendance) | Absensi harian karyawan per lokasi kerja. |
| Karyawan, absensi, dan kartu pintar | [`employee_bpjs`](#employee_bpjs) | Data BPJS karyawan. |
| Karyawan, absensi, dan kartu pintar | [`employee_certificates`](#employee_certificates) | Sertifikat kompetensi karyawan beserta masa berlaku. |
| Karyawan, absensi, dan kartu pintar | [`employee_contracts`](#employee_contracts) | Kontrak kerja karyawan. |
| Karyawan, absensi, dan kartu pintar | [`employee_mcus`](#employee_mcus) | Hasil Medical Check Up beserta masa berlaku. |
| Karyawan, absensi, dan kartu pintar | [`employee_sika`](#employee_sika) | Data SIKA (surat izin kerja area). |
| Karyawan, absensi, dan kartu pintar | [`employee_vaccinations`](#employee_vaccinations) | Data vaksinasi. |
| Karyawan, absensi, dan kartu pintar | [`employee_files`](#employee_files) | Berkas dokumen karyawan; terhubung ke tabel dokumen di atas. |
| Karyawan, absensi, dan kartu pintar | [`employee_alarm_log`](#employee_alarm_log) | Log alarm dokumen karyawan yang mendekati/lewat masa berlaku. |
| Karyawan, absensi, dan kartu pintar | [`smart_card_observations`](#smart_card_observations) | Observasi kartu pintar (perilaku aman/tidak aman) per karyawan. |
| Karyawan, absensi, dan kartu pintar | [`upload_history`](#upload_history) | Riwayat unggah berkas massal (Excel) dan ringkasan hasilnya. |
| Karyawan, absensi, dan kartu pintar | [`upload_observation_errors`](#upload_observation_errors) | Baris yang gagal pada unggahan massal. |
| Karyawan, absensi, dan kartu pintar | [`pob_unmatched_logs`](#pob_unmatched_logs) | Log data POB yang tidak cocok dengan master karyawan. |
| Log manhours | [`log_manhours`](#log_manhours) | Rekap manhours harian. Keunikan dijaga 3 partial unique index (lihat kolom Indeks). |
| CSMS (Contractor Safety Management System) | [`csms_guideline`](#csms_guideline) | Dokumen pedoman CSMS. |
| CSMS (Contractor Safety Management System) | [`csms_qualification_assessment`](#csms_qualification_assessment) | Penilaian kualifikasi (prakualifikasi) kontraktor. |
| CSMS (Contractor Safety Management System) | [`csms_risk_assessment`](#csms_risk_assessment) | Penilaian risiko kontraktor. |
| CSMS (Contractor Safety Management System) | [`csms_file`](#csms_file) | Berkas pendukung pedoman, kualifikasi, dan penilaian risiko. |
| CSMS (Contractor Safety Management System) | [`csms_contract`](#csms_contract) | Kontrak CSMS per kontraktor/kapal. |
| CSMS (Contractor Safety Management System) | [`csms_contract_folder`](#csms_contract_folder) | Pohon folder dan berkas penilaian kontrak. `path` (ltree) menyimpan hierarki; kolom `ai_*` menyimpan hasil AI. |
| CSMS (Contractor Safety Management System) | [`csms_approval_log`](#csms_approval_log) | Riwayat approval/penilaian folder oleh evaluator/verifikator. |
| CSMS (Contractor Safety Management System) | [`csms_alarm_log`](#csms_alarm_log) | Log alarm kontrak (mis. masa berlaku). |
| CSMS (Contractor Safety Management System) | [`csms_evaluation_email_log`](#csms_evaluation_email_log) | Log email notifikasi hasil evaluasi. |
| CSMS AI | [`csms_ai_evaluation_job`](#csms_ai_evaluation_job) | Antrian/job penilaian AI per folder (status, mode fast/thorough, progres). |
| CSMS AI | [`csms_ai_apply_log`](#csms_ai_apply_log) | Log penerapan rekomendasi AI ke nilai folder (bisa dibatalkan). |
| CSMS AI | [`csms_ai_feedback`](#csms_ai_feedback) | Umpan balik evaluator terhadap hasil AI. |
| CSMS AI | [`csms_ai_file_summary`](#csms_ai_file_summary) | Cache ringkasan isi berkas hasil ekstraksi. |
| CSMS AI | [`csms_evidence_chunk`](#csms_evidence_chunk) | Potongan teks bukti dari berkas (opsional embedding vector). |
| CSMS AI | [`csms_knowledge_base`](#csms_knowledge_base) | Knowledge base kriteria penilaian (teks + embedding vector). |
| CSMS AI | [`csms_ai_rubric_version`](#csms_ai_rubric_version) | Versi rubric (kriteria penilaian Excel); satu versi aktif per tipe. Dibuat csms-ai. |
| CSMS AI | [`csms_ai_rubric_item`](#csms_ai_rubric_item) | Elemen rubric per versi (kolom sama dengan Excel). Dibuat csms-ai. |
| CSMS AI | [`csms_ai_trial_snapshot`](#csms_ai_trial_snapshot) | Cadangan hasil AI sebelum uji coba rubric. Dibuat csms-ai. |
| CSMS AI | [`csms_ai_trial_result`](#csms_ai_trial_result) | Hasil uji coba rubric dibanding nilai evaluator. Dibuat csms-ai. |

## Autentikasi, pengguna, dan master data

Akun login (Better Auth), peran pengguna, dan data master kontraktor, kapal, dan lokasi.

### users

Pengguna aplikasi. Kolom `role` (enum UserRole) menentukan menu dan hak akses.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `email` | character varying(50) | ya |  |  |
| `hsse_passport_number` | text | ya |  |  |
| `email_verified` | boolean | tidak | false |  |
| `name` | character varying(50) | tidak |  |  |
| `role` | UserRole | tidak | 'user'::"UserRole" |  |
| `image` | text | ya |  |  |
| `signature` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |
| `banned` | boolean | tidak | false |  |
| `ban_reason` | text | ya |  |  |
| `ban_expires` | timestamp with time zone | ya |  |  |

Indeks:

- `users_email_key`: `UNIQUE btree (email)`
- `users_hsse_passport_number_key`: `UNIQUE btree (hsse_passport_number)`

### accounts

Kredensial login Better Auth per pengguna. `password` berisi hash scrypt (salt:key), bukan teks asli.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `account_id` | text | tidak |  |  |
| `provider_id` | text | tidak |  |  |
| `issuer` | text | ya |  |  |
| `user_id` | uuid | tidak |  | FK → users.id (CASCADE) |
| `access_token` | text | ya |  |  |
| `refresh_token` | text | ya |  |  |
| `id_token` | text | ya |  |  |
| `access_token_expires_at` | timestamp with time zone | ya |  |  |
| `refresh_token_expires_at` | timestamp with time zone | ya |  |  |
| `scope` | text | ya |  |  |
| `password` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### sessions

Sesi login aktif (token cookie), dengan IP dan user agent.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `expires_at` | timestamp with time zone | tidak |  |  |
| `token` | text | tidak |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |
| `ip_address` | text | ya |  |  |
| `user_agent` | text | ya |  |  |
| `user_id` | uuid | tidak |  | FK → users.id (CASCADE) |
| `impersonated_by` | uuid | ya |  |  |

Indeks:

- `idx_sessions_token`: `btree (token)`
- `idx_sessions_user_id`: `btree (user_id)`
- `sessions_token_key`: `UNIQUE btree (token)`

### verification

Token verifikasi Better Auth (reset password, verifikasi email).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `identifier` | character varying(255) | tidak |  |  |
| `value` | character varying(255) | tidak |  |  |
| `expires_at` | timestamp with time zone | tidak |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### sub_contractors

Master perusahaan kontraktor.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `name` | text | tidak |  |  |
| `category` | character varying(255) | ya |  |  |

### vessels

Master kapal.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `vessel_name` | text | tidak |  |  |
| `type` | character varying(255) | ya |  |  |
| `status` | boolean | tidak | true |  |
| `personnel_count` | integer | ya |  |  |
| `extra` | jsonb | ya |  |  |

### contractor_vessels

Relasi banyak-ke-banyak kontraktor dan kapal.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contractor_id` | uuid | tidak |  | FK → sub_contractors.id (CASCADE) |
| `vessel_id` | uuid | tidak |  | FK → vessels.id (CASCADE) |

### user_contractors

Pemetaan pengguna ke kontraktor/kapal yang boleh diakses.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `user_id` | uuid | tidak |  | FK → users.id (CASCADE) |
| `contractor_id` | uuid | tidak |  | FK → sub_contractors.id (CASCADE) |
| `vessel_id` | uuid | ya |  | FK → vessels.id (CASCADE) |

### locations

Master lokasi (koordinat) untuk cuaca dan lokasi kerja.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `name` | text | tidak |  |  |
| `description` | text | ya |  |  |
| `geometry` | text | ya |  |  |
| `status` | boolean | ya | false |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### user_alarm_log

Log notifikasi/alarm yang ditujukan ke pengguna.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `alarm_employee_id` | uuid | ya |  |  |
| `alarm_csms_id` | uuid | ya |  |  |
| `user_id` | uuid | tidak |  | FK → users.id (CASCADE) |
| `is_read` | boolean | ya | false |  |
| `read_at` | timestamp with time zone | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |

## Proyek dan laporan harian (Daily Report)

Satu laporan harian per lokasi kerja per tanggal, dengan 14 tabel detail.

### subtypes

Proyek / sub-tipe pekerjaan. Kolom `extra` (JSON) menyimpan pengaturan proyek, mis. autoCalculateManhours.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `name` | character varying(150) | tidak |  |  |
| `extra` | jsonb | ya |  |  |

Indeks:

- `subtypesNameKey`: `UNIQUE btree (name)`

### work_locations

Lokasi kerja di bawah satu proyek.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `project_id` | uuid | tidak |  | FK → subtypes.id (CASCADE) |
| `name` | character varying(150) | tidak |  |  |
| `latitude` | character varying(50) | ya |  |  |
| `longitude` | character varying(50) | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

Indeks:

- `work_locations_project_name_unique`: `UNIQUE btree (project_id, name)`

### daily_reports

Header laporan harian (tanggal, lokasi kerja, pembuat, status).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_date` | date | tidak |  |  |
| `reported_by` | character varying(100) | tidak |  |  |
| `instansi` | character varying(100) | tidak |  |  |
| `form_type` | character varying(50) | tidak |  |  |
| `work_location_id` | uuid | ya |  | FK → work_locations.id (SET NULL) |
| `created_by_user_id` | uuid | tidak |  | FK → users.id (NO ACTION) |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### daily_report_subtypes

Relasi laporan harian ke proyek.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `subtype_id` | uuid | tidak |  | FK → subtypes.id (CASCADE) |

### report_manhours

Jam kerja (manhours) pada laporan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `pob_phe_oses` | integer | ya |  |  |
| `pob_contractor` | integer | ya |  |  |
| `hours_pob_phe_oses` | integer | ya |  |  |
| `hours_pob_contractor` | integer | ya |  |  |

### report_lagging_indicators

Indikator lagging HSE (insiden, kecelakaan, dsb.).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `description` | text | ya |  |  |
| `status_free_lta_ri` | boolean | ya |  |  |
| `free_lta_days` | integer | ya |  |  |
| `free_ri_days` | integer | ya |  |  |
| `recordable_incident` | integer | ya |  |  |
| `non_recordable_incident` | integer | ya |  |  |
| `fatality` | integer | ya |  |  |
| `lti` | integer | ya |  |  |
| `restricted_work_day_case` | integer | ya |  |  |
| `medical_treatment_case` | integer | ya |  |  |
| `first_aid` | integer | ya |  |  |
| `near_miss` | integer | ya |  |  |
| `unsafe_action` | integer | ya |  |  |
| `unsafe_condition` | integer | ya |  |  |
| `environmental_damage` | integer | ya |  |  |
| `property_damage` | integer | ya |  |  |

### report_highlights

Sorotan / catatan penting laporan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `daily_activities` | text | ya |  |  |
| `daily_next_plan` | text | ya |  |  |
| `weather` | text | ya |  |  |
| `overstay_personnel` | jsonb | ya | '[]' |  |

### report_meetings

Kegiatan rapat / safety meeting.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `meeting_description` | text | ya |  |  |
| `jenis_meeting` | text | ya |  |  |
| `absence_percentage` | integer | ya |  |  |
| `toolbox_meeting` | integer | ya |  |  |
| `tool_box_talk` | integer | ya |  |  |
| `general_safety_meeting` | integer | ya |  |  |
| `safety_committee_meeting` | integer | ya |  |  |
| `pre_job_safety_meeting` | integer | ya |  |  |
| `monthly_safety_meeting` | integer | ya |  |  |
| `hsse_site_orientation_meeting` | integer | ya |  |  |
| `marine_contractor_meeting` | integer | ya |  |  |
| `safety_stand_down_meeting` | integer | ya |  |  |
| `management_visit` | integer | ya |  |  |
| `marine_safety_campaign` | integer | ya |  |  |
| `learning_from_campaign_event` | integer | ya |  |  |
| `others_meeting` | integer | ya |  |  |

### report_drills

Kegiatan drill / latihan keadaan darurat.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `drill_description` | text | ya |  |  |
| `total_participants` | integer | ya |  |  |
| `fire_drill` | integer | ya |  |  |
| `abandon_drill` | integer | ya |  |  |
| `mustering_drill` | integer | ya |  |  |
| `medievac_drill` | integer | ya |  |  |
| `h2s_drill` | integer | ya |  |  |
| `oil_pollution_prevention_drill` | integer | ya |  |  |
| `steering_gear_failure_drill` | integer | ya |  |  |
| `man_overboard_drill` | integer | ya |  |  |
| `grounding_drill` | integer | ya |  |  |
| `first_aid_drill` | integer | ya |  |  |
| `collision_drill` | integer | ya |  |  |
| `dry_drill` | integer | ya |  |  |
| `wet_drill` | integer | ya |  |  |
| `others_drill` | integer | ya |  |  |

### report_trainings

Kegiatan pelatihan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `training_description` | text | ya |  |  |
| `total_participants` | integer | ya |  |  |
| `clsr` | integer | ya |  |  |
| `akhlak` | integer | ya |  |  |
| `unsafe_action_category` | integer | ya |  |  |
| `sika` | integer | ya |  |  |
| `l2ra` | integer | ya |  |  |
| `pre_site_induction` | integer | ya |  |  |
| `site_induction` | integer | ya |  |  |
| `shipboard_training` | integer | ya |  |  |
| `others_training` | integer | ya |  |  |

### report_inspections

Kegiatan inspeksi.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `type` | character varying(20) | tidak |  |  |
| `description` | text | ya |  |  |
| `open_finding` | integer | ya |  |  |
| `close_finding` | integer | ya |  |  |
| `outstanding_finding` | integer | ya |  |  |
| `no_issue` | integer | ya |  |  |
| `lsa_inspection` | integer | ya |  |  |
| `ffa_inspection` | integer | ya |  |  |
| `ppe_inspection` | integer | ya |  |  |
| `other_inspection` | integer | ya |  |  |
| `follow_up` | text | ya |  |  |
| `deadline` | date | ya |  |  |
| `finding` | text | ya |  |  |
| `inspection` | integer | ya |  |  |

### report_smart_cards

Ringkasan kartu pintar (observasi keselamatan) pada laporan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `kartu_pintar_description` | text | ya |  |  |
| `unsafe_action` | integer | ya |  |  |
| `unsafe_condition` | integer | ya |  |  |
| `nearmiss` | integer | ya |  |  |
| `process_safety` | integer | ya |  |  |
| `non_participants` | jsonb | ya | '[]' |  |

### report_permits

Izin kerja (Permit to Work) pada laporan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `permit_to_work_description` | text | ya |  |  |
| `open_date` | date | ya |  |  |
| `no_ptw` | character varying(100) | ya |  |  |
| `location` | text | ya |  |  |
| `ra_jsa` | text | ya |  |  |
| `performing_authority` | text | ya |  |  |
| `site_controller` | text | ya |  |  |
| `general_work` | integer | ya |  |  |
| `breaking_containment` | integer | ya |  |  |
| `hot_work` | integer | ya |  |  |
| `critical_work` | integer | ya |  |  |
| `confined_space` | integer | ya |  |  |
| `cwp_l1` | integer | ya |  |  |
| `hwsp_l1` | integer | ya |  |  |
| `confined_space_1` | integer | ya |  |  |
| `cwp_l2` | integer | ya |  |  |
| `hwsp_l2` | integer | ya |  |  |
| `confined_space_2` | integer | ya |  |  |
| `isolation_confirmation_certificate` | integer | ya |  |  |

### report_operations

Ringkasan kegiatan operasi.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `region` | character varying(10) | tidak |  |  |
| `current_hi_po_activity` | text | ya |  |  |
| `forecast_hi_po_activity` | text | ya |  |  |
| `wind_speed` | text | ya |  |  |
| `sea_level` | text | ya |  |  |
| `sky_condition` | text | ya |  |  |
| `pitching_rolling` | text | ya |  |  |

### report_vessels_under_po_summary

Ringkasan kapal di bawah PO.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `total_boat_today` | integer | ya |  |  |
| `total_boat_monthly` | integer | ya |  |  |
| `total_boat_ytd` | integer | ya |  |  |
| `total_employee_today` | integer | ya |  |  |
| `total_employee_monthly` | integer | ya |  |  |
| `total_employee_ytd` | integer | ya |  |  |

### report_files

Lampiran berkas laporan; terhubung ke detail (rapat, drill, pelatihan, inspeksi, izin).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `report_id` | uuid | tidak |  | FK → daily_reports.id (CASCADE) |
| `inspection_id` | uuid | ya |  | FK → report_inspections.id (CASCADE) |
| `meeting_id` | uuid | ya |  | FK → report_meetings.id (CASCADE) |
| `drill_id` | uuid | ya |  | FK → report_drills.id (CASCADE) |
| `training_id` | uuid | ya |  | FK → report_trainings.id (CASCADE) |
| `permit_id` | uuid | ya |  | FK → report_permits.id (CASCADE) |
| `file_name` | character varying(255) | tidak |  |  |
| `file_type` | character varying(255) | tidak |  |  |
| `file_path` | text | tidak |  |  |
| `section` | character varying(100) | ya |  |  |
| `note` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### report_weather_sealevel

Data cuaca dan tinggi muka laut harian (diisi job terjadwal).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `region_weather` | jsonb | ya |  |  |
| `region_sealevel` | jsonb | ya |  |  |
| `trigger_at` | timestamp with time zone | tidak |  |  |

## Karyawan, absensi, dan kartu pintar

Data personel kontraktor, dokumen kepegawaian, absensi/POB, dan observasi kartu pintar.

### employees

Master karyawan (kontraktor, kapal, proyek).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `sub_contractor_id` | uuid | tidak |  | FK → sub_contractors.id (NO ACTION) |
| `category` | text | ya |  |  |
| `employee_name` | text | ya |  |  |
| `date_of_birth` | date | ya |  |  |
| `position` | text | ya |  |  |
| `image` | text | ya |  |  |
| `vessel_id` | uuid | ya |  | FK → vessels.id (NO ACTION) |
| `project_id` | uuid | ya |  | FK → subtypes.id (NO ACTION) |
| `project_name` | text | ya |  |  |
| `location` | text | ya |  |  |
| `identity_number` | text | ya |  |  |
| `hsse_passport_number` | text | ya |  |  |
| `status_on_duty` | boolean | ya | false |  |
| `link_data_employee` | text | ya |  |  |
| `verified_by` | text | ya |  |  |
| `verified_date` | date | ya |  |  |
| `remarks` | text | ya |  |  |
| `other_health_assurance` | text | ya |  |  |
| `ppe` | text | ya |  |  |
| `validation_status` | text | ya | 'pending' |  |
| `created_at` | timestamp with time zone | ya | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

Indeks:

- `employees_hsse_passport_number_key`: `UNIQUE btree (hsse_passport_number)`

### employee_status

Riwayat status siklus karyawan (on duty, off, dsb.).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `is_on_duty` | boolean | ya | false |  |
| `last_check_in` | timestamp with time zone | ya |  |  |
| `last_check_out` | timestamp with time zone | ya |  |  |
| `current_cycle_start_date` | date | ya |  |  |
| `updated_at` | timestamp with time zone | ya | now() |  |

Indeks:

- `employee_status_employee_id_key`: `UNIQUE btree (employee_id)`

### attendance

Absensi harian karyawan per lokasi kerja.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `attendance_date` | date | tidak |  |  |
| `status_after` | text | tidak |  |  |
| `work_location_id` | uuid | ya |  | FK → work_locations.id (SET NULL) |
| `photo_evidence` | text | ya |  |  |
| `notes` | text | ya |  |  |
| `position` | jsonb | ya |  |  |
| `created_at` | timestamp with time zone | ya | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### employee_bpjs

Data BPJS karyawan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `bpjs_employment` | text | ya |  |  |
| `bpjs_health` | text | ya |  |  |

### employee_certificates

Sertifikat kompetensi karyawan beserta masa berlaku.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `name` | text | ya |  |  |
| `expired_date` | date | ya |  |  |
| `is_permanent` | boolean | ya | false |  |
| `status` | character varying(255) | ya |  |  |
| `last_validated_at` | timestamp with time zone | ya |  |  |

### employee_contracts

Kontrak kerja karyawan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `contract_code` | text | ya |  |  |
| `expired_date` | date | ya |  |  |
| `expired_date_company` | date | ya |  |  |

### employee_mcus

Hasil Medical Check Up beserta masa berlaku.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `mcu_date` | date | ya |  |  |
| `mcu_expired_date` | date | ya |  |  |
| `mcu_hospital_name` | text | ya |  |  |
| `mcu_deviation_notes` | text | ya |  |  |
| `mcu_follow_up` | text | ya |  |  |
| `ohih_review` | text | ya |  |  |
| `status_kelaikan_bekerja` | text | ya |  |  |
| `skj_score` | text | ya |  |  |

### employee_sika

Data SIKA (surat izin kerja area).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `type` | text | ya |  |  |
| `status` | text | ya |  |  |
| `expired_date` | date | ya |  |  |

### employee_vaccinations

Data vaksinasi.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `vaccine_date` | date | ya |  |  |
| `vaccine_status` | text | ya |  |  |

### employee_files

Berkas dokumen karyawan; terhubung ke tabel dokumen di atas.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `contract_id` | uuid | ya |  | FK → employee_contracts.id (NO ACTION) |
| `mcu_id` | uuid | ya |  | FK → employee_mcus.id (NO ACTION) |
| `bpjs_id` | uuid | ya |  | FK → employee_bpjs.id (NO ACTION) |
| `vaccination_id` | uuid | ya |  | FK → employee_vaccinations.id (NO ACTION) |
| `certificate_id` | uuid | ya |  | FK → employee_certificates.id (NO ACTION) |
| `sika_id` | uuid | ya |  | FK → employee_sika.id (NO ACTION) |
| `type` | text | ya |  |  |
| `file_name` | text | ya |  |  |
| `file_path` | text | ya |  |  |
| `file_type` | text | ya |  |  |
| `uploaded_at` | timestamp with time zone | ya | now() |  |

### employee_alarm_log

Log alarm dokumen karyawan yang mendekati/lewat masa berlaku.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `employee_id` | uuid | ya |  | FK → employees.id (NO ACTION) |
| `type` | text | ya |  |  |
| `message` | text | ya |  |  |
| `status` | text | ya |  |  |
| `triggered_at` | timestamp with time zone | ya | now() |  |

### smart_card_observations

Observasi kartu pintar (perilaku aman/tidak aman) per karyawan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | integer | tidak |  | PK |
| `employee_id` | uuid | tidak |  | FK → employees.id (NO ACTION) |
| `observation_date` | date | ya |  |  |
| `observation_time` | text | ya |  |  |
| `observation_function` | text | ya |  |  |
| `observation_area` | text | ya |  |  |
| `specific_location` | text | ya |  |  |
| `report_category` | text | ya |  |  |
| `observed_behavior` | text | ya |  |  |
| `observed_aspect_category` | text | ya |  |  |
| `worker` | text | ya |  |  |
| `ppe_type_observed` | text | ya |  |  |
| `unsafe_ppe_cause` | text | ya |  |  |
| `equipment_tools` | text | ya |  |  |
| `material` | text | ya |  |  |
| `procedures_admin_control` | text | ya |  |  |
| `work_environment` | text | ya |  |  |
| `unsafe_behavior_description` | text | ya |  |  |
| `agreed_follow_up` | text | ya |  |  |
| `clsr` | text | ya |  |  |
| `stop_work_authority` | boolean | ya |  |  |
| `current_intervention_status` | text | ya |  |  |
| `finding_description` | text | ya |  |  |
| `root_cause` | text | ya |  |  |
| `potential_impact` | text | ya |  |  |
| `current_handling` | text | ya |  |  |
| `follow_up_handling` | text | ya |  |  |
| `follow_up_priority` | text | ya |  |  |
| `responsible_person` | text | ya |  |  |
| `uc_finding_status` | text | ya |  |  |
| `what` | text | ya |  |  |
| `who` | text | ya |  |  |
| `how` | text | ya |  |  |
| `near_miss_handling` | text | ya |  |  |
| `near_miss_category` | text | ya |  |  |
| `near_miss_potential_impact` | text | ya |  |  |
| `additional_notes` | text | ya |  |  |
| `clsr2` | text | ya |  |  |
| `current_near_miss_status` | text | ya |  |  |
| `created_at` | timestamp with time zone | ya | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### upload_history

Riwayat unggah berkas massal (Excel) dan ringkasan hasilnya.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `user_id` | uuid | ya |  | FK → users.id (CASCADE) |
| `filename` | text | tidak |  |  |
| `status` | text | tidak |  |  |
| `total_rows` | integer | ya |  |  |
| `valid_rows` | integer | ya |  |  |
| `error_rows` | integer | ya |  |  |
| `skipped_rows` | integer | ya |  |  |
| `inserted_rows` | integer | ya |  |  |
| `first_id` | integer | ya |  |  |
| `last_id` | integer | ya |  |  |
| `error_message` | text | ya |  |  |
| `has_errors` | boolean | ya | false |  |
| `created_at` | timestamp with time zone | ya | now() |  |

### upload_observation_errors

Baris yang gagal pada unggahan massal.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `upload_history_id` | uuid | ya |  | FK → upload_history.id (CASCADE) |
| `original_row` | text | ya |  |  |
| `error_type` | text | ya |  |  |
| `suggestions` | text | ya |  |  |
| `status` | text | ya | 'error' |  |
| `created_at` | timestamp with time zone | ya | now() |  |

### pob_unmatched_logs

Log data POB yang tidak cocok dengan master karyawan.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `uploaded_at` | timestamp with time zone | ya | now() |  |
| `unmatched_count` | integer | ya | 0 |  |
| `filename` | text | ya |  |  |
| `data` | jsonb | ya |  |  |

## Log manhours

Rekap jam kerja harian per proyek/lokasi/kontraktor/kapal, diisi job terjadwal.

### log_manhours

Rekap manhours harian. Keunikan dijaga 3 partial unique index (lihat kolom Indeks).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `log_date` | date | tidak |  |  |
| `contractor_id` | uuid | ya |  | FK → sub_contractors.id (NO ACTION) |
| `project_id` | uuid | ya |  | FK → subtypes.id (NO ACTION) |
| `work_location_id` | uuid | ya |  | FK → work_locations.id (CASCADE) |
| `vessel_id` | uuid | ya |  | FK → vessels.id (NO ACTION) |
| `pob_phe_oses` | integer | ya | 0 |  |
| `pob_contractor` | integer | ya | 0 |  |
| `is_legacy` | boolean | ya | false |  |
| `created_at` | timestamp with time zone | ya | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

Indeks:

- `project_date_unique`: `UNIQUE btree (log_date, project_id) WHERE ((is_legacy = false) AND (work_location_id IS NULL))`
- `project_date_work_location_unique`: `UNIQUE btree (log_date, project_id, work_location_id) WHERE ((is_legacy = false) AND (work_location_id IS NOT NULL))`
- `vessel_date_unique`: `UNIQUE btree (log_date, vessel_id) WHERE (is_legacy = false)`

## CSMS (Contractor Safety Management System)

Kontrak, folder penilaian berjenjang (ltree), approval, dan log terkait.

### csms_guideline

Dokumen pedoman CSMS.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `title` | character varying(100) | tidak |  |  |
| `description` | text | tidak |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `edited_at` | timestamp with time zone | tidak | now() |  |

### csms_qualification_assessment

Penilaian kualifikasi (prakualifikasi) kontraktor.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contractor_id` | uuid | tidak |  | FK → sub_contractors.id (CASCADE) |
| `title` | character varying(255) | tidak |  |  |
| `number_certificate` | character varying(255) | tidak |  |  |
| `assessment_date` | date | tidak |  |  |
| `expired_date` | date | tidak |  |  |
| `qualified_value` | character varying(255) | tidak |  |  |
| `assessment_result` | character varying(255) | tidak |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `edited_at` | timestamp with time zone | tidak | now() |  |

### csms_risk_assessment

Penilaian risiko kontraktor.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contractor_id` | uuid | tidak |  | FK → sub_contractors.id (CASCADE) |
| `title` | character varying(100) | tidak |  |  |
| `description` | text | tidak |  |  |
| `status` | character varying(100) | tidak |  |  |
| `note` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `edited_at` | timestamp with time zone | tidak | now() |  |

### csms_file

Berkas pendukung pedoman, kualifikasi, dan penilaian risiko.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `guideline_id` | uuid | ya |  | FK → csms_guideline.id (CASCADE) |
| `risk_assessment_id` | uuid | ya |  | FK → csms_risk_assessment.id (CASCADE) |
| `qualification_assessment_id` | uuid | ya |  | FK → csms_qualification_assessment.id (CASCADE) |
| `file_name` | character varying(255) | tidak |  |  |
| `file_type` | character varying(255) | tidak |  |  |
| `file_path` | text | tidak |  |  |
| `note` | text | ya |  |  |

### csms_contract

Kontrak CSMS per kontraktor/kapal.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contractor_id` | uuid | tidak |  | FK → sub_contractors.id (CASCADE) |
| `vessel_id` | uuid | ya |  | FK → vessels.id (CASCADE) |
| `title` | character varying(255) | tidak |  |  |
| `number_contract` | character varying(255) | tidak |  |  |
| `risk_assessment_id` | character varying(255) | tidak | '-' |  |
| `risk_level` | character varying(50) | tidak | 'N/A' |  |
| `start_date` | date | tidak |  |  |
| `end_date` | date | tidak |  |  |
| `nearest_ongoing_assessment_date` | jsonb | ya |  |  |
| `final_assessment_date` | date | tidak |  |  |
| `note` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |
| `extra` | jsonb | ya |  |  |

### csms_contract_folder

Pohon folder dan berkas penilaian kontrak. `path` (ltree) menyimpan hierarki; kolom `ai_*` menyimpan hasil AI.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contract_id` | uuid | tidak |  | FK → csms_contract.id (CASCADE) |
| `parent_id` | uuid | ya |  | FK → csms_contract_folder.id (CASCADE) |
| `name` | character varying(255) | tidak |  |  |
| `description` | text | ya |  |  |
| `path` | ltree | tidak |  |  |
| `depth` | integer | ya |  |  |
| `file_type` | character varying(50) | ya |  |  |
| `file_path` | text | ya |  |  |
| `is_complete` | boolean | ya |  |  |
| `status` | StatusContractEnum | tidak | 'pending'::"StatusContractEnum" |  |
| `score` | numeric(5,2) | tidak | 0 |  |
| `ai_status` | StatusContractEnum | tidak | 'pending'::"StatusContractEnum" |  |
| `ai_score` | numeric(5,2) | tidak | 0 |  |
| `ai_reasoning` | text | ya |  |  |
| `note` | text | ya |  |  |
| `note_contractor` | text | ya |  |  |
| `user_id` | uuid[] | ya |  |  |
| `is_final` | boolean | ya |  |  |
| `is_copy` | integer | ya | 0 |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |
| `assessment_date` | timestamp with time zone | ya |  |  |
| `ai_processed_at` | timestamp with time zone | ya |  |  |
| `note_updated_by` | uuid | ya |  |  |
| `note_updated_at` | timestamp with time zone | ya |  |  |
| `note_contractor_updated_by` | uuid | ya |  |  |
| `note_contractor_updated_at` | timestamp with time zone | ya |  |  |

Indeks:

- `csms_contract_folder_contract_id_idx`: `btree (contract_id)`
- `csms_contract_folder_parent_id_idx`: `btree (parent_id)`
- `csms_contract_folder_path_gist_idx`: `gist (path)`

### csms_approval_log

Riwayat approval/penilaian folder oleh evaluator/verifikator.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `folder_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `contract_id` | uuid | tidak |  | FK → csms_contract.id (CASCADE) |
| `user_id` | uuid | ya |  | FK → users.id (CASCADE) |
| `approval_level` | character varying(50) | tidak |  |  |
| `status` | character varying(50) | tidak |  |  |
| `note` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

Indeks:

- `csms_approval_log_contract_id_idx`: `btree (contract_id)`
- `csms_approval_log_folder_id_idx`: `btree (folder_id)`

### csms_alarm_log

Log alarm kontrak (mis. masa berlaku).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contractor_id` | uuid | tidak |  | FK → sub_contractors.id (CASCADE) |
| `contract_id` | uuid | ya |  | FK → csms_contract.id (CASCADE) |
| `type` | character varying(50) | tidak |  |  |
| `title` | character varying(255) | tidak |  |  |
| `description` | text | tidak |  |  |
| `status` | text | ya |  |  |
| `triggered_at` | timestamp with time zone | ya | now() |  |

Indeks:

- `csms_alarm_log_contract_id_idx`: `btree (contract_id)`

### csms_evaluation_email_log

Log email notifikasi hasil evaluasi.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contract_id` | uuid | tidak |  | FK → csms_contract.id (CASCADE) |
| `folder_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `user_id` | uuid | tidak |  |  |
| `email` | character varying(255) | tidak |  |  |
| `status` | character varying(50) | tidak | 'sent' |  |
| `error_message` | text | ya |  |  |
| `sent_at` | timestamp with time zone | tidak | now() |  |
| `created_at` | timestamp with time zone | tidak | now() |  |

Indeks:

- `csms_evaluation_email_log_contract_id_idx`: `btree (contract_id)`
- `csms_evaluation_email_log_folder_id_idx`: `btree (folder_id)`

## CSMS AI

Antrian penilaian AI, knowledge base, rubric, dan hasil uji coba. Tabel rubric/trial dibuat oleh csms-ai.

### csms_ai_evaluation_job

Antrian/job penilaian AI per folder (status, mode fast/thorough, progres).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contract_folder_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `user_id` | uuid | ya |  | FK → users.id (NO ACTION) |
| `status` | character varying(50) | tidak | 'queued' |  |
| `progress_message` | text | ya |  |  |
| `error_message` | text | ya |  |  |
| `juror_scores` | jsonb | ya |  |  |
| `model_used` | character varying(100) | ya |  |  |
| `started_at` | timestamp with time zone | ya |  |  |
| `completed_at` | timestamp with time zone | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `target_folder_ids` | uuid[] | ya |  |  |
| `mode` | character varying(20) | tidak | 'thorough' |  |
| `trial` | boolean | tidak | false |  |
| `rubric_version_id` | uuid | ya |  |  |

Indeks:

- `csms_ai_evaluation_job_contract_folder_id_idx`: `btree (contract_folder_id)`

### csms_ai_apply_log

Log penerapan rekomendasi AI ke nilai folder (bisa dibatalkan).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `batch_id` | uuid | tidak |  |  |
| `root_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `folder_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `prev_status` | character varying(20) | ya |  |  |
| `prev_score` | numeric(5,2) | ya |  |  |
| `prev_note` | text | ya |  |  |
| `user_id` | uuid | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `undone_at` | timestamp with time zone | ya |  |  |

Indeks:

- `csms_ai_apply_log_folder_id_idx`: `btree (folder_id)`
- `csms_ai_apply_log_root_idx`: `btree (root_id, created_at DESC)`

### csms_ai_feedback

Umpan balik evaluator terhadap hasil AI.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `folder_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `element_code` | character varying(10) | tidak |  |  |
| `ai_score` | numeric(5,2) | ya |  |  |
| `evaluator_score` | numeric(5,2) | ya |  |  |
| `reason` | text | tidak |  |  |
| `user_id` | uuid | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `source` | character varying(20) | tidak | 'evaluator' |  |

Indeks:

- `csms_ai_feedback_element_idx`: `btree (element_code, created_at DESC)`
- `csms_ai_feedback_folder_id_idx`: `btree (folder_id)`

### csms_ai_file_summary

Cache ringkasan isi berkas hasil ekstraksi.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `file_id` | uuid | tidak |  | PK |
| `element_code` | character varying(10) | tidak |  | PK |
| `rubric_version` | integer | tidak | 0 | PK |
| `summary` | jsonb | tidak |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |

### csms_evidence_chunk

Potongan teks bukti dari berkas (opsional embedding vector).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `contract_folder_id` | uuid | tidak |  | FK → csms_contract_folder.id (CASCADE) |
| `file_path` | text | tidak |  |  |
| `chunk_index` | integer | tidak |  |  |
| `content` | text | tidak |  |  |
| `metadata` | jsonb | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `embedding` | vector | ya |  |  |

Indeks:

- `csms_evidence_chunk_contract_folder_id_idx`: `btree (contract_folder_id)`

### csms_knowledge_base

Knowledge base kriteria penilaian (teks + embedding vector).

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `category_id` | character varying(50) | tidak |  |  |
| `title` | character varying(255) | tidak |  |  |
| `description` | text | tidak |  |  |
| `document_requirements` | jsonb | ya |  |  |
| `validation_rules` | jsonb | ya |  |  |
| `scoring_rules` | jsonb | ya |  |  |
| `user_context` | text | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |
| `embedding` | vector | ya |  |  |

Indeks:

- `csms_knowledge_base_category_id_key`: `UNIQUE btree (category_id)`

### csms_ai_rubric_version

Versi rubric (kriteria penilaian Excel); satu versi aktif per tipe. Dibuat csms-ai.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `id` | uuid | tidak | gen_random_uuid() | PK |
| `rubric_type` | character varying(20) | tidak | 'marine' |  |
| `version` | integer | tidak |  |  |
| `label` | text | ya |  |  |
| `source_filename` | text | ya |  |  |
| `is_active` | boolean | tidak | false |  |
| `created_by` | uuid | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |

Indeks:

- `csms_ai_rubric_version_rubric_type_version_key`: `UNIQUE btree (rubric_type, version)`

### csms_ai_rubric_item

Elemen rubric per versi (kolom sama dengan Excel). Dibuat csms-ai.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `version_id` | uuid | tidak |  | PK, FK → csms_ai_rubric_version.id (CASCADE) |
| `no` | character varying(10) | tidak |  | PK |
| `element_category` | text | ya |  |  |
| `element` | text | ya |  |  |
| `required_document` | text | ya |  |  |
| `document_format` | text | ya |  |  |
| `evaluation_criteria` | text | ya |  |  |
| `mandatory_fields` | text | ya |  |  |
| `score_0` | text | ya |  |  |
| `score_3` | text | ya |  |  |
| `score_6` | text | ya |  |  |
| `score_10` | text | ya |  |  |
| `status_accept` | text | ya |  |  |
| `status_reject` | text | ya |  |  |
| `status_revision` | text | ya |  |  |
| `validation_method` | text | ya |  |  |
| `ai_checkpoint_keywords` | text | ya |  |  |
| `document_expiry_check` | text | ya |  |  |
| `ai_confidence_threshold` | text | ya |  |  |
| `ai_reasoning_hint` | text | ya |  |  |
| `notes` | text | ya |  |  |
| `updated_at` | timestamp with time zone | tidak | now() |  |

### csms_ai_trial_snapshot

Cadangan hasil AI sebelum uji coba rubric. Dibuat csms-ai.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `job_id` | uuid | tidak |  | PK |
| `folder_id` | uuid | tidak |  | PK |
| `ai_score` | numeric(5,2) | ya |  |  |
| `ai_status` | character varying(20) | ya |  |  |
| `ai_reasoning` | text | ya |  |  |
| `ai_processed_at` | timestamp with time zone | ya |  |  |

### csms_ai_trial_result

Hasil uji coba rubric dibanding nilai evaluator. Dibuat csms-ai.

| Kolom | Tipe | Null | Default | Kunci |
| --- | --- | --- | --- | --- |
| `job_id` | uuid | tidak |  | PK |
| `folder_id` | uuid | tidak |  | PK |
| `rubric_version_id` | uuid | ya |  |  |
| `element_code` | character varying(10) | ya |  |  |
| `ai_score` | numeric(5,2) | ya |  |  |
| `ai_status` | character varying(20) | ya |  |  |
| `confidence` | numeric(4,2) | ya |  |  |
| `evaluator_score` | numeric(5,2) | ya |  |  |
| `evaluator_status` | character varying(20) | ya |  |  |
| `created_at` | timestamp with time zone | tidak | now() |  |
