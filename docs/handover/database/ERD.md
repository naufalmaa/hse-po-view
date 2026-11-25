# ERD HSE Proview

Diagram relasi per domain (Mermaid `erDiagram`), dihasilkan dari foreign key di database. Hanya kolom PK dan FK yang ditampilkan agar terbaca; daftar kolom lengkap ada di [KAMUS-DATA.md](KAMUS-DATA.md). Tabel dari domain lain yang dirujuk ikut tampil tanpa kolom.

## Autentikasi, pengguna, dan master data

```mermaid
erDiagram
  direction LR
  users {
    uuid id PK
  }
  accounts {
    uuid id PK
    uuid user_id FK
  }
  sessions {
    uuid id PK
    uuid user_id FK
  }
  verification {
    uuid id PK
  }
  sub_contractors {
    uuid id PK
  }
  vessels {
    uuid id PK
  }
  contractor_vessels {
    uuid id PK
    uuid contractor_id FK
    uuid vessel_id FK
  }
  user_contractors {
    uuid id PK
    uuid user_id FK
    uuid contractor_id FK
    uuid vessel_id FK
  }
  locations {
    uuid id PK
  }
  user_alarm_log {
    uuid id PK
    uuid user_id FK
  }
  users ||--o{ accounts : "user_id"
  sub_contractors ||--o{ contractor_vessels : "contractor_id"
  vessels ||--o{ contractor_vessels : "vessel_id"
  users ||--o{ sessions : "user_id"
  users ||--o{ user_alarm_log : "user_id"
  sub_contractors ||--o{ user_contractors : "contractor_id"
  users ||--o{ user_contractors : "user_id"
  vessels ||--o{ user_contractors : "vessel_id (opsional)"
```

## Proyek dan laporan harian (Daily Report)

```mermaid
erDiagram
  direction LR
  subtypes {
    uuid id PK
  }
  work_locations {
    uuid id PK
    uuid project_id FK
  }
  daily_reports {
    uuid id PK
    uuid work_location_id FK
    uuid created_by_user_id FK
  }
  daily_report_subtypes {
    uuid id PK
    uuid report_id FK
    uuid subtype_id FK
  }
  report_manhours {
    uuid id PK
    uuid report_id FK
  }
  report_lagging_indicators {
    uuid id PK
    uuid report_id FK
  }
  report_highlights {
    uuid id PK
    uuid report_id FK
  }
  report_meetings {
    uuid id PK
    uuid report_id FK
  }
  report_drills {
    uuid id PK
    uuid report_id FK
  }
  report_trainings {
    uuid id PK
    uuid report_id FK
  }
  report_inspections {
    uuid id PK
    uuid report_id FK
  }
  report_smart_cards {
    uuid id PK
    uuid report_id FK
  }
  report_permits {
    uuid id PK
    uuid report_id FK
  }
  report_operations {
    uuid id PK
    uuid report_id FK
  }
  report_vessels_under_po_summary {
    uuid id PK
    uuid report_id FK
  }
  report_files {
    uuid id PK
    uuid report_id FK
    uuid inspection_id FK
    uuid meeting_id FK
    uuid drill_id FK
    uuid training_id FK
    uuid permit_id FK
  }
  report_weather_sealevel {
    uuid id PK
  }
  daily_reports ||--o{ daily_report_subtypes : "report_id"
  subtypes ||--o{ daily_report_subtypes : "subtype_id"
  users ||--o{ daily_reports : "created_by_user_id"
  work_locations ||--o{ daily_reports : "work_location_id (opsional)"
  daily_reports ||--o{ report_drills : "report_id"
  report_drills ||--o{ report_files : "drill_id (opsional)"
  report_inspections ||--o{ report_files : "inspection_id (opsional)"
  report_meetings ||--o{ report_files : "meeting_id (opsional)"
  report_permits ||--o{ report_files : "permit_id (opsional)"
  daily_reports ||--o{ report_files : "report_id"
  report_trainings ||--o{ report_files : "training_id (opsional)"
  daily_reports ||--o{ report_highlights : "report_id"
  daily_reports ||--o{ report_inspections : "report_id"
  daily_reports ||--o{ report_lagging_indicators : "report_id"
  daily_reports ||--o{ report_manhours : "report_id"
  daily_reports ||--o{ report_meetings : "report_id"
  daily_reports ||--o{ report_operations : "report_id"
  daily_reports ||--o{ report_permits : "report_id"
  daily_reports ||--o{ report_smart_cards : "report_id"
  daily_reports ||--o{ report_trainings : "report_id"
  daily_reports ||--o{ report_vessels_under_po_summary : "report_id"
  subtypes ||--o{ work_locations : "project_id"
```

## Karyawan, absensi, dan kartu pintar

```mermaid
erDiagram
  direction LR
  employees {
    uuid id PK
    uuid sub_contractor_id FK
    uuid vessel_id FK
    uuid project_id FK
  }
  employee_status {
    uuid id PK
    uuid employee_id FK
  }
  attendance {
    uuid id PK
    uuid employee_id FK
    uuid work_location_id FK
  }
  employee_bpjs {
    uuid id PK
    uuid employee_id FK
  }
  employee_certificates {
    uuid id PK
    uuid employee_id FK
  }
  employee_contracts {
    uuid id PK
    uuid employee_id FK
  }
  employee_mcus {
    uuid id PK
    uuid employee_id FK
  }
  employee_sika {
    uuid id PK
    uuid employee_id FK
  }
  employee_vaccinations {
    uuid id PK
    uuid employee_id FK
  }
  employee_files {
    uuid id PK
    uuid employee_id FK
    uuid contract_id FK
    uuid mcu_id FK
    uuid bpjs_id FK
    uuid vaccination_id FK
    uuid certificate_id FK
    uuid sika_id FK
  }
  employee_alarm_log {
    uuid id PK
    uuid employee_id FK
  }
  smart_card_observations {
    integer id PK
    uuid employee_id FK
  }
  upload_history {
    uuid id PK
    uuid user_id FK
  }
  upload_observation_errors {
    uuid id PK
    uuid upload_history_id FK
  }
  pob_unmatched_logs {
    uuid id PK
  }
  employees ||--o{ attendance : "employee_id"
  work_locations ||--o{ attendance : "work_location_id (opsional)"
  employees ||--o{ employee_alarm_log : "employee_id (opsional)"
  employees ||--o{ employee_bpjs : "employee_id"
  employees ||--o{ employee_certificates : "employee_id"
  employees ||--o{ employee_contracts : "employee_id"
  employee_bpjs ||--o{ employee_files : "bpjs_id (opsional)"
  employee_certificates ||--o{ employee_files : "certificate_id (opsional)"
  employee_contracts ||--o{ employee_files : "contract_id (opsional)"
  employees ||--o{ employee_files : "employee_id"
  employee_mcus ||--o{ employee_files : "mcu_id (opsional)"
  employee_sika ||--o{ employee_files : "sika_id (opsional)"
  employee_vaccinations ||--o{ employee_files : "vaccination_id (opsional)"
  employees ||--o{ employee_mcus : "employee_id"
  employees ||--o{ employee_sika : "employee_id"
  employees ||--o{ employee_status : "employee_id"
  employees ||--o{ employee_vaccinations : "employee_id"
  subtypes ||--o{ employees : "project_id (opsional)"
  sub_contractors ||--o{ employees : "sub_contractor_id"
  vessels ||--o{ employees : "vessel_id (opsional)"
  employees ||--o{ smart_card_observations : "employee_id"
  users ||--o{ upload_history : "user_id (opsional)"
  upload_history ||--o{ upload_observation_errors : "upload_history_id (opsional)"
```

## Log manhours

```mermaid
erDiagram
  log_manhours {
    uuid id PK
    uuid contractor_id FK
    uuid project_id FK
    uuid work_location_id FK
    uuid vessel_id FK
  }
  sub_contractors ||--o{ log_manhours : "contractor_id (opsional)"
  subtypes ||--o{ log_manhours : "project_id (opsional)"
  vessels ||--o{ log_manhours : "vessel_id (opsional)"
  work_locations ||--o{ log_manhours : "work_location_id (opsional)"
```

## CSMS (Contractor Safety Management System)

```mermaid
erDiagram
  direction LR
  csms_guideline {
    uuid id PK
  }
  csms_qualification_assessment {
    uuid id PK
    uuid contractor_id FK
  }
  csms_risk_assessment {
    uuid id PK
    uuid contractor_id FK
  }
  csms_file {
    uuid id PK
    uuid guideline_id FK
    uuid risk_assessment_id FK
    uuid qualification_assessment_id FK
  }
  csms_contract {
    uuid id PK
    uuid contractor_id FK
    uuid vessel_id FK
  }
  csms_contract_folder {
    uuid id PK
    uuid contract_id FK
    uuid parent_id FK
  }
  csms_approval_log {
    uuid id PK
    uuid folder_id FK
    uuid contract_id FK
    uuid user_id FK
  }
  csms_alarm_log {
    uuid id PK
    uuid contractor_id FK
    uuid contract_id FK
  }
  csms_evaluation_email_log {
    uuid id PK
    uuid contract_id FK
    uuid folder_id FK
  }
  csms_contract ||--o{ csms_alarm_log : "contract_id (opsional)"
  sub_contractors ||--o{ csms_alarm_log : "contractor_id"
  csms_contract ||--o{ csms_approval_log : "contract_id"
  csms_contract_folder ||--o{ csms_approval_log : "folder_id"
  users ||--o{ csms_approval_log : "user_id (opsional)"
  sub_contractors ||--o{ csms_contract : "contractor_id"
  vessels ||--o{ csms_contract : "vessel_id (opsional)"
  csms_contract ||--o{ csms_contract_folder : "contract_id"
  csms_contract_folder ||--o{ csms_contract_folder : "parent_id (opsional)"
  csms_contract ||--o{ csms_evaluation_email_log : "contract_id"
  csms_contract_folder ||--o{ csms_evaluation_email_log : "folder_id"
  csms_guideline ||--o{ csms_file : "guideline_id (opsional)"
  csms_qualification_assessment ||--o{ csms_file : "qualification_assessment_id (opsional)"
  csms_risk_assessment ||--o{ csms_file : "risk_assessment_id (opsional)"
  sub_contractors ||--o{ csms_qualification_assessment : "contractor_id"
  sub_contractors ||--o{ csms_risk_assessment : "contractor_id"
```

## CSMS AI

```mermaid
erDiagram
  direction LR
  csms_ai_evaluation_job {
    uuid id PK
    uuid contract_folder_id FK
    uuid user_id FK
  }
  csms_ai_apply_log {
    uuid id PK
    uuid root_id FK
    uuid folder_id FK
  }
  csms_ai_feedback {
    uuid id PK
    uuid folder_id FK
  }
  csms_ai_file_summary {
    uuid file_id PK
    character_varying_10_ element_code PK
    integer rubric_version PK
  }
  csms_evidence_chunk {
    uuid id PK
    uuid contract_folder_id FK
  }
  csms_knowledge_base {
    uuid id PK
  }
  csms_ai_rubric_version {
    uuid id PK
  }
  csms_ai_rubric_item {
    uuid version_id PK
    character_varying_10_ no PK
  }
  csms_ai_trial_snapshot {
    uuid job_id PK
    uuid folder_id PK
  }
  csms_ai_trial_result {
    uuid job_id PK
    uuid folder_id PK
  }
  csms_contract_folder ||--o{ csms_ai_apply_log : "folder_id"
  csms_contract_folder ||--o{ csms_ai_apply_log : "root_id"
  csms_contract_folder ||--o{ csms_ai_evaluation_job : "contract_folder_id"
  users ||--o{ csms_ai_evaluation_job : "user_id (opsional)"
  csms_contract_folder ||--o{ csms_ai_feedback : "folder_id"
  csms_ai_rubric_version ||--o{ csms_ai_rubric_item : "version_id"
  csms_contract_folder ||--o{ csms_evidence_chunk : "contract_folder_id"
```
