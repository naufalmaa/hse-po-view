-- Skema database HSE Proview, dihasilkan oleh `npm run schema:dump` (backend) dan
-- `python -m server.scripts.ensure_schema` (csms-ai). Jangan diedit manual.
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: ltree; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS ltree WITH SCHEMA public;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;

--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;

--
-- Name: StatusContractEnum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."StatusContractEnum" AS ENUM (
    'pending',
    'accept',
    'reject',
    'revision'
);

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."UserRole" AS ENUM (
    'admin',
    'user',
    'evaluator',
    'verifikator',
    'manager',
    'contractor',
    'crew',
    'employee'
);

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    issuer text,
    user_id uuid NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp with time zone,
    refresh_token_expires_at timestamp with time zone,
    scope text,
    password text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: attendance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attendance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    attendance_date date NOT NULL,
    status_after text NOT NULL,
    work_location_id uuid,
    photo_evidence text,
    notes text,
    "position" jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: contractor_vessels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contractor_vessels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contractor_id uuid NOT NULL,
    vessel_id uuid NOT NULL
);

--
-- Name: csms_ai_apply_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_apply_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id uuid NOT NULL,
    root_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    prev_status character varying(20),
    prev_score numeric(5,2),
    prev_note text,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    undone_at timestamp with time zone
);

--
-- Name: csms_ai_evaluation_job; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_evaluation_job (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_folder_id uuid NOT NULL,
    user_id uuid,
    status character varying(50) DEFAULT 'queued'::character varying NOT NULL,
    progress_message text,
    error_message text,
    juror_scores jsonb,
    model_used character varying(100),
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    target_folder_ids uuid[],
    mode character varying(20) DEFAULT 'thorough'::character varying NOT NULL,
    trial boolean DEFAULT false NOT NULL,
    rubric_version_id uuid
);

--
-- Name: csms_ai_feedback; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folder_id uuid NOT NULL,
    element_code character varying(10) NOT NULL,
    ai_score numeric(5,2),
    evaluator_score numeric(5,2),
    reason text NOT NULL,
    user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    source character varying(20) DEFAULT 'evaluator'::character varying NOT NULL
);

--
-- Name: csms_ai_file_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_file_summary (
    file_id uuid NOT NULL,
    element_code character varying(10) NOT NULL,
    rubric_version integer DEFAULT 0 NOT NULL,
    summary jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_ai_rubric_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_rubric_item (
    version_id uuid NOT NULL,
    no character varying(10) NOT NULL,
    element_category text,
    element text,
    required_document text,
    document_format text,
    evaluation_criteria text,
    mandatory_fields text,
    score_0 text,
    score_3 text,
    score_6 text,
    score_10 text,
    status_accept text,
    status_reject text,
    status_revision text,
    validation_method text,
    ai_checkpoint_keywords text,
    document_expiry_check text,
    ai_confidence_threshold text,
    ai_reasoning_hint text,
    notes text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_ai_rubric_version; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_rubric_version (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    rubric_type character varying(20) DEFAULT 'marine'::character varying NOT NULL,
    version integer NOT NULL,
    label text,
    source_filename text,
    is_active boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_ai_trial_result; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_trial_result (
    job_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    rubric_version_id uuid,
    element_code character varying(10),
    ai_score numeric(5,2),
    ai_status character varying(20),
    confidence numeric(4,2),
    evaluator_score numeric(5,2),
    evaluator_status character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_ai_trial_snapshot; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_ai_trial_snapshot (
    job_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    ai_score numeric(5,2),
    ai_status character varying(20),
    ai_reasoning text,
    ai_processed_at timestamp with time zone
);

--
-- Name: csms_alarm_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_alarm_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contractor_id uuid NOT NULL,
    contract_id uuid,
    type character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    status text,
    triggered_at timestamp with time zone DEFAULT now()
);

--
-- Name: csms_approval_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_approval_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    folder_id uuid NOT NULL,
    contract_id uuid NOT NULL,
    user_id uuid,
    approval_level character varying(50) NOT NULL,
    status character varying(50) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_contract; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_contract (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contractor_id uuid NOT NULL,
    vessel_id uuid,
    title character varying(255) NOT NULL,
    number_contract character varying(255) NOT NULL,
    risk_assessment_id character varying(255) DEFAULT '-'::character varying NOT NULL,
    risk_level character varying(50) DEFAULT 'N/A'::character varying NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    nearest_ongoing_assessment_date jsonb,
    final_assessment_date date NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    extra jsonb
);

--
-- Name: csms_contract_folder; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_contract_folder (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    parent_id uuid,
    name character varying(255) NOT NULL,
    description text,
    path public.ltree NOT NULL,
    depth integer GENERATED ALWAYS AS ((public.nlevel(path) - 1)) STORED,
    file_type character varying(50),
    file_path text,
    is_complete boolean,
    status public."StatusContractEnum" DEFAULT 'pending'::public."StatusContractEnum" NOT NULL,
    score numeric(5,2) DEFAULT 0 NOT NULL,
    ai_status public."StatusContractEnum" DEFAULT 'pending'::public."StatusContractEnum" NOT NULL,
    ai_score numeric(5,2) DEFAULT 0 NOT NULL,
    ai_reasoning text,
    note text,
    note_contractor text,
    user_id uuid[],
    is_final boolean,
    is_copy integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    assessment_date timestamp with time zone,
    ai_processed_at timestamp with time zone,
    note_updated_by uuid,
    note_updated_at timestamp with time zone,
    note_contractor_updated_by uuid,
    note_contractor_updated_at timestamp with time zone
);

--
-- Name: csms_evaluation_email_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_evaluation_email_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_id uuid NOT NULL,
    folder_id uuid NOT NULL,
    user_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    status character varying(50) DEFAULT 'sent'::character varying NOT NULL,
    error_message text,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_evidence_chunk; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_evidence_chunk (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contract_folder_id uuid NOT NULL,
    file_path text NOT NULL,
    chunk_index integer NOT NULL,
    content text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(1536)
);

--
-- Name: csms_file; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_file (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    guideline_id uuid,
    risk_assessment_id uuid,
    qualification_assessment_id uuid,
    file_name character varying(255) NOT NULL,
    file_type character varying(255) NOT NULL,
    file_path text NOT NULL,
    note text
);

--
-- Name: csms_guideline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_guideline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(100) NOT NULL,
    description text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_knowledge_base; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_knowledge_base (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id character varying(50) NOT NULL,
    title character varying(255) NOT NULL,
    description text NOT NULL,
    document_requirements jsonb,
    validation_rules jsonb,
    scoring_rules jsonb,
    user_context text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    embedding public.vector(1536)
);

--
-- Name: csms_qualification_assessment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_qualification_assessment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contractor_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    number_certificate character varying(255) NOT NULL,
    assessment_date date NOT NULL,
    expired_date date NOT NULL,
    qualified_value character varying(255) NOT NULL,
    assessment_result character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: csms_risk_assessment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.csms_risk_assessment (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contractor_id uuid NOT NULL,
    title character varying(100) NOT NULL,
    description text NOT NULL,
    status character varying(100) NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    edited_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: daily_report_subtypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_report_subtypes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    subtype_id uuid NOT NULL
);

--
-- Name: daily_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_date date NOT NULL,
    reported_by character varying(100) NOT NULL,
    instansi character varying(100) NOT NULL,
    form_type character varying(50) NOT NULL,
    work_location_id uuid,
    created_by_user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: employee_alarm_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_alarm_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid,
    type text,
    message text,
    status text,
    triggered_at timestamp with time zone DEFAULT now()
);

--
-- Name: employee_bpjs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_bpjs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    bpjs_employment text,
    bpjs_health text
);

--
-- Name: employee_certificates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_certificates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    name text,
    expired_date date,
    is_permanent boolean DEFAULT false,
    status character varying(255),
    last_validated_at timestamp with time zone
);

--
-- Name: employee_contracts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    contract_code text,
    expired_date date,
    expired_date_company date
);

--
-- Name: employee_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    contract_id uuid,
    mcu_id uuid,
    bpjs_id uuid,
    vaccination_id uuid,
    certificate_id uuid,
    sika_id uuid,
    type text,
    file_name text,
    file_path text,
    file_type text,
    uploaded_at timestamp with time zone DEFAULT now()
);

--
-- Name: employee_mcus; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_mcus (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    mcu_date date,
    mcu_expired_date date,
    mcu_hospital_name text,
    mcu_deviation_notes text,
    mcu_follow_up text,
    ohih_review text,
    status_kelaikan_bekerja text,
    skj_score text
);

--
-- Name: employee_sika; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_sika (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    type text,
    status text,
    expired_date date
);

--
-- Name: employee_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_status (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    is_on_duty boolean DEFAULT false,
    last_check_in timestamp with time zone,
    last_check_out timestamp with time zone,
    current_cycle_start_date date,
    updated_at timestamp with time zone DEFAULT now()
);

--
-- Name: employee_vaccinations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_vaccinations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    employee_id uuid NOT NULL,
    vaccine_date date,
    vaccine_status text
);

--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sub_contractor_id uuid NOT NULL,
    category text,
    employee_name text,
    date_of_birth date,
    "position" text,
    image text,
    vessel_id uuid,
    project_id uuid,
    project_name text,
    location text,
    identity_number text,
    hsse_passport_number text,
    status_on_duty boolean DEFAULT false,
    link_data_employee text,
    verified_by text,
    verified_date date,
    remarks text,
    other_health_assurance text,
    ppe text,
    validation_status text DEFAULT 'pending'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    geometry text,
    status boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: log_manhours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.log_manhours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    log_date date NOT NULL,
    contractor_id uuid,
    project_id uuid,
    work_location_id uuid,
    vessel_id uuid,
    pob_phe_oses integer DEFAULT 0,
    pob_contractor integer DEFAULT 0,
    is_legacy boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: pob_unmatched_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pob_unmatched_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now(),
    unmatched_count integer DEFAULT 0,
    filename text,
    data jsonb
);

--
-- Name: report_drills; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_drills (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    drill_description text,
    total_participants integer,
    fire_drill integer,
    abandon_drill integer,
    mustering_drill integer,
    medievac_drill integer,
    h2s_drill integer,
    oil_pollution_prevention_drill integer,
    steering_gear_failure_drill integer,
    man_overboard_drill integer,
    grounding_drill integer,
    first_aid_drill integer,
    collision_drill integer,
    dry_drill integer,
    wet_drill integer,
    others_drill integer
);

--
-- Name: report_files; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_files (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    inspection_id uuid,
    meeting_id uuid,
    drill_id uuid,
    training_id uuid,
    permit_id uuid,
    file_name character varying(255) NOT NULL,
    file_type character varying(255) NOT NULL,
    file_path text NOT NULL,
    section character varying(100),
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: report_highlights; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_highlights (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    daily_activities text,
    daily_next_plan text,
    weather text,
    overstay_personnel jsonb DEFAULT '[]'::jsonb
);

--
-- Name: report_inspections; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_inspections (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    description text,
    open_finding integer,
    close_finding integer,
    outstanding_finding integer,
    no_issue integer,
    lsa_inspection integer,
    ffa_inspection integer,
    ppe_inspection integer,
    other_inspection integer,
    follow_up text,
    deadline date,
    finding text,
    inspection integer
);

--
-- Name: report_lagging_indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_lagging_indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    description text,
    status_free_lta_ri boolean,
    free_lta_days integer,
    free_ri_days integer,
    recordable_incident integer,
    non_recordable_incident integer,
    fatality integer,
    lti integer,
    restricted_work_day_case integer,
    medical_treatment_case integer,
    first_aid integer,
    near_miss integer,
    unsafe_action integer,
    unsafe_condition integer,
    environmental_damage integer,
    property_damage integer
);

--
-- Name: report_manhours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_manhours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    pob_phe_oses integer,
    pob_contractor integer,
    hours_pob_phe_oses integer,
    hours_pob_contractor integer
);

--
-- Name: report_meetings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_meetings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    meeting_description text,
    jenis_meeting text,
    absence_percentage integer,
    toolbox_meeting integer,
    tool_box_talk integer,
    general_safety_meeting integer,
    safety_committee_meeting integer,
    pre_job_safety_meeting integer,
    monthly_safety_meeting integer,
    hsse_site_orientation_meeting integer,
    marine_contractor_meeting integer,
    safety_stand_down_meeting integer,
    management_visit integer,
    marine_safety_campaign integer,
    learning_from_campaign_event integer,
    others_meeting integer
);

--
-- Name: report_operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    region character varying(10) NOT NULL,
    current_hi_po_activity text,
    forecast_hi_po_activity text,
    wind_speed text,
    sea_level text,
    sky_condition text,
    pitching_rolling text
);

--
-- Name: report_permits; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_permits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    permit_to_work_description text,
    open_date date,
    no_ptw character varying(100),
    location text,
    ra_jsa text,
    performing_authority text,
    site_controller text,
    general_work integer,
    breaking_containment integer,
    hot_work integer,
    critical_work integer,
    confined_space integer,
    cwp_l1 integer,
    hwsp_l1 integer,
    confined_space_1 integer,
    cwp_l2 integer,
    hwsp_l2 integer,
    confined_space_2 integer,
    isolation_confirmation_certificate integer
);

--
-- Name: report_smart_cards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_smart_cards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    kartu_pintar_description text,
    unsafe_action integer,
    unsafe_condition integer,
    nearmiss integer,
    process_safety integer,
    non_participants jsonb DEFAULT '[]'::jsonb
);

--
-- Name: report_trainings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_trainings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    training_description text,
    total_participants integer,
    clsr integer,
    akhlak integer,
    unsafe_action_category integer,
    sika integer,
    l2ra integer,
    pre_site_induction integer,
    site_induction integer,
    shipboard_training integer,
    others_training integer
);

--
-- Name: report_vessels_under_po_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_vessels_under_po_summary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    report_id uuid NOT NULL,
    total_boat_today integer,
    total_boat_monthly integer,
    total_boat_ytd integer,
    total_employee_today integer,
    total_employee_monthly integer,
    total_employee_ytd integer
);

--
-- Name: report_weather_sealevel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.report_weather_sealevel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    region_weather jsonb,
    region_sealevel jsonb,
    trigger_at timestamp with time zone NOT NULL
);

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text,
    user_id uuid NOT NULL,
    impersonated_by uuid
);

--
-- Name: smart_card_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.smart_card_observations (
    id integer NOT NULL,
    employee_id uuid NOT NULL,
    observation_date date,
    observation_time text,
    observation_function text,
    observation_area text,
    specific_location text,
    report_category text,
    observed_behavior text,
    observed_aspect_category text,
    worker text,
    ppe_type_observed text,
    unsafe_ppe_cause text,
    equipment_tools text,
    material text,
    procedures_admin_control text,
    work_environment text,
    unsafe_behavior_description text,
    agreed_follow_up text,
    clsr text,
    stop_work_authority boolean,
    current_intervention_status text,
    finding_description text,
    root_cause text,
    potential_impact text,
    current_handling text,
    follow_up_handling text,
    follow_up_priority text,
    responsible_person text,
    uc_finding_status text,
    what text,
    who text,
    how text,
    near_miss_handling text,
    near_miss_category text,
    near_miss_potential_impact text,
    additional_notes text,
    clsr2 text,
    current_near_miss_status text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: smart_card_observations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.smart_card_observations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.smart_card_observations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: sub_contractors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_contractors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category character varying(255)
);

--
-- Name: subtypes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subtypes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    extra jsonb
);

--
-- Name: upload_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    filename text NOT NULL,
    status text NOT NULL,
    total_rows integer,
    valid_rows integer,
    error_rows integer,
    skipped_rows integer,
    inserted_rows integer,
    first_id integer,
    last_id integer,
    error_message text,
    has_errors boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: upload_observation_errors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upload_observation_errors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_history_id uuid,
    original_row text,
    error_type text,
    suggestions text,
    status text DEFAULT 'error'::text,
    created_at timestamp with time zone DEFAULT now()
);

--
-- Name: user_alarm_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_alarm_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alarm_employee_id uuid,
    alarm_csms_id uuid,
    user_id uuid NOT NULL,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: user_contractors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_contractors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    contractor_id uuid NOT NULL,
    vessel_id uuid
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(50),
    hsse_passport_number text,
    email_verified boolean DEFAULT false NOT NULL,
    name character varying(50) NOT NULL,
    role public."UserRole" DEFAULT 'user'::public."UserRole" NOT NULL,
    image text,
    signature text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    banned boolean DEFAULT false NOT NULL,
    ban_reason text,
    ban_expires timestamp with time zone
);

--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    identifier character varying(255) NOT NULL,
    value character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: vessels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vessels (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    vessel_name text NOT NULL,
    type character varying(255),
    status boolean DEFAULT true NOT NULL,
    personnel_count integer,
    extra jsonb
);

--
-- Name: work_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    latitude character varying(50),
    longitude character varying(50),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: accounts accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

--
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (id);

--
-- Name: contractor_vessels contractor_vessels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contractor_vessels
    ADD CONSTRAINT contractor_vessels_pkey PRIMARY KEY (id);

--
-- Name: csms_ai_apply_log csms_ai_apply_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_apply_log
    ADD CONSTRAINT csms_ai_apply_log_pkey PRIMARY KEY (id);

--
-- Name: csms_ai_evaluation_job csms_ai_evaluation_job_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_evaluation_job
    ADD CONSTRAINT csms_ai_evaluation_job_pkey PRIMARY KEY (id);

--
-- Name: csms_ai_feedback csms_ai_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_feedback
    ADD CONSTRAINT csms_ai_feedback_pkey PRIMARY KEY (id);

--
-- Name: csms_ai_file_summary csms_ai_file_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_file_summary
    ADD CONSTRAINT csms_ai_file_summary_pkey PRIMARY KEY (file_id, element_code, rubric_version);

--
-- Name: csms_ai_rubric_item csms_ai_rubric_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_rubric_item
    ADD CONSTRAINT csms_ai_rubric_item_pkey PRIMARY KEY (version_id, no);

--
-- Name: csms_ai_rubric_version csms_ai_rubric_version_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_rubric_version
    ADD CONSTRAINT csms_ai_rubric_version_pkey PRIMARY KEY (id);

--
-- Name: csms_ai_rubric_version csms_ai_rubric_version_rubric_type_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_rubric_version
    ADD CONSTRAINT csms_ai_rubric_version_rubric_type_version_key UNIQUE (rubric_type, version);

--
-- Name: csms_ai_trial_result csms_ai_trial_result_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_trial_result
    ADD CONSTRAINT csms_ai_trial_result_pkey PRIMARY KEY (job_id, folder_id);

--
-- Name: csms_ai_trial_snapshot csms_ai_trial_snapshot_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_trial_snapshot
    ADD CONSTRAINT csms_ai_trial_snapshot_pkey PRIMARY KEY (job_id, folder_id);

--
-- Name: csms_alarm_log csms_alarm_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_alarm_log
    ADD CONSTRAINT csms_alarm_log_pkey PRIMARY KEY (id);

--
-- Name: csms_approval_log csms_approval_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_approval_log
    ADD CONSTRAINT csms_approval_log_pkey PRIMARY KEY (id);

--
-- Name: csms_contract_folder csms_contract_folder_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_contract_folder
    ADD CONSTRAINT csms_contract_folder_pkey PRIMARY KEY (id);

--
-- Name: csms_contract csms_contract_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_contract
    ADD CONSTRAINT csms_contract_pkey PRIMARY KEY (id);

--
-- Name: csms_evaluation_email_log csms_evaluation_email_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_evaluation_email_log
    ADD CONSTRAINT csms_evaluation_email_log_pkey PRIMARY KEY (id);

--
-- Name: csms_evidence_chunk csms_evidence_chunk_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_evidence_chunk
    ADD CONSTRAINT csms_evidence_chunk_pkey PRIMARY KEY (id);

--
-- Name: csms_file csms_file_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_file
    ADD CONSTRAINT csms_file_pkey PRIMARY KEY (id);

--
-- Name: csms_guideline csms_guideline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_guideline
    ADD CONSTRAINT csms_guideline_pkey PRIMARY KEY (id);

--
-- Name: csms_knowledge_base csms_knowledge_base_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_knowledge_base
    ADD CONSTRAINT csms_knowledge_base_category_id_key UNIQUE (category_id);

--
-- Name: csms_knowledge_base csms_knowledge_base_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_knowledge_base
    ADD CONSTRAINT csms_knowledge_base_pkey PRIMARY KEY (id);

--
-- Name: csms_qualification_assessment csms_qualification_assessment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_qualification_assessment
    ADD CONSTRAINT csms_qualification_assessment_pkey PRIMARY KEY (id);

--
-- Name: csms_risk_assessment csms_risk_assessment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_risk_assessment
    ADD CONSTRAINT csms_risk_assessment_pkey PRIMARY KEY (id);

--
-- Name: daily_report_subtypes daily_report_subtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_report_subtypes
    ADD CONSTRAINT daily_report_subtypes_pkey PRIMARY KEY (id);

--
-- Name: daily_reports daily_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_pkey PRIMARY KEY (id);

--
-- Name: employee_alarm_log employee_alarm_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_alarm_log
    ADD CONSTRAINT employee_alarm_log_pkey PRIMARY KEY (id);

--
-- Name: employee_bpjs employee_bpjs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_bpjs
    ADD CONSTRAINT employee_bpjs_pkey PRIMARY KEY (id);

--
-- Name: employee_certificates employee_certificates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_pkey PRIMARY KEY (id);

--
-- Name: employee_contracts employee_contracts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT employee_contracts_pkey PRIMARY KEY (id);

--
-- Name: employee_files employee_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_pkey PRIMARY KEY (id);

--
-- Name: employee_mcus employee_mcus_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_mcus
    ADD CONSTRAINT employee_mcus_pkey PRIMARY KEY (id);

--
-- Name: employee_sika employee_sika_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_sika
    ADD CONSTRAINT employee_sika_pkey PRIMARY KEY (id);

--
-- Name: employee_status employee_status_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_status
    ADD CONSTRAINT employee_status_employee_id_key UNIQUE (employee_id);

--
-- Name: employee_status employee_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_status
    ADD CONSTRAINT employee_status_pkey PRIMARY KEY (id);

--
-- Name: employee_vaccinations employee_vaccinations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_vaccinations
    ADD CONSTRAINT employee_vaccinations_pkey PRIMARY KEY (id);

--
-- Name: employees employees_hsse_passport_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_hsse_passport_number_key UNIQUE (hsse_passport_number);

--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);

--
-- Name: locations locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.locations
    ADD CONSTRAINT locations_pkey PRIMARY KEY (id);

--
-- Name: log_manhours log_manhours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_manhours
    ADD CONSTRAINT log_manhours_pkey PRIMARY KEY (id);

--
-- Name: pob_unmatched_logs pob_unmatched_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pob_unmatched_logs
    ADD CONSTRAINT pob_unmatched_logs_pkey PRIMARY KEY (id);

--
-- Name: report_drills report_drills_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_drills
    ADD CONSTRAINT report_drills_pkey PRIMARY KEY (id);

--
-- Name: report_files report_files_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_pkey PRIMARY KEY (id);

--
-- Name: report_highlights report_highlights_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_highlights
    ADD CONSTRAINT report_highlights_pkey PRIMARY KEY (id);

--
-- Name: report_inspections report_inspections_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_inspections
    ADD CONSTRAINT report_inspections_pkey PRIMARY KEY (id);

--
-- Name: report_lagging_indicators report_lagging_indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_lagging_indicators
    ADD CONSTRAINT report_lagging_indicators_pkey PRIMARY KEY (id);

--
-- Name: report_manhours report_manhours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_manhours
    ADD CONSTRAINT report_manhours_pkey PRIMARY KEY (id);

--
-- Name: report_meetings report_meetings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_meetings
    ADD CONSTRAINT report_meetings_pkey PRIMARY KEY (id);

--
-- Name: report_operations report_operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_operations
    ADD CONSTRAINT report_operations_pkey PRIMARY KEY (id);

--
-- Name: report_permits report_permits_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_permits
    ADD CONSTRAINT report_permits_pkey PRIMARY KEY (id);

--
-- Name: report_smart_cards report_smart_cards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_smart_cards
    ADD CONSTRAINT report_smart_cards_pkey PRIMARY KEY (id);

--
-- Name: report_trainings report_trainings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_trainings
    ADD CONSTRAINT report_trainings_pkey PRIMARY KEY (id);

--
-- Name: report_vessels_under_po_summary report_vessels_under_po_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_vessels_under_po_summary
    ADD CONSTRAINT report_vessels_under_po_summary_pkey PRIMARY KEY (id);

--
-- Name: report_weather_sealevel report_weather_sealevel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_weather_sealevel
    ADD CONSTRAINT report_weather_sealevel_pkey PRIMARY KEY (id);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

--
-- Name: sessions sessions_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_token_key UNIQUE (token);

--
-- Name: smart_card_observations smart_card_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_card_observations
    ADD CONSTRAINT smart_card_observations_pkey PRIMARY KEY (id);

--
-- Name: sub_contractors sub_contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_contractors
    ADD CONSTRAINT sub_contractors_pkey PRIMARY KEY (id);

--
-- Name: subtypes subtypesNameKey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtypes
    ADD CONSTRAINT "subtypesNameKey" UNIQUE (name);

--
-- Name: subtypes subtypes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subtypes
    ADD CONSTRAINT subtypes_pkey PRIMARY KEY (id);

--
-- Name: upload_history upload_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_history
    ADD CONSTRAINT upload_history_pkey PRIMARY KEY (id);

--
-- Name: upload_observation_errors upload_observation_errors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_observation_errors
    ADD CONSTRAINT upload_observation_errors_pkey PRIMARY KEY (id);

--
-- Name: user_alarm_log user_alarm_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_alarm_log
    ADD CONSTRAINT user_alarm_log_pkey PRIMARY KEY (id);

--
-- Name: user_contractors user_contractors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contractors
    ADD CONSTRAINT user_contractors_pkey PRIMARY KEY (id);

--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);

--
-- Name: users users_hsse_passport_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_hsse_passport_number_key UNIQUE (hsse_passport_number);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);

--
-- Name: vessels vessels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vessels
    ADD CONSTRAINT vessels_pkey PRIMARY KEY (id);

--
-- Name: work_locations work_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_pkey PRIMARY KEY (id);

--
-- Name: work_locations work_locations_project_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_project_name_unique UNIQUE (project_id, name);

--
-- Name: csms_ai_apply_log_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_ai_apply_log_folder_id_idx ON public.csms_ai_apply_log USING btree (folder_id);

--
-- Name: csms_ai_apply_log_root_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_ai_apply_log_root_idx ON public.csms_ai_apply_log USING btree (root_id, created_at DESC);

--
-- Name: csms_ai_evaluation_job_contract_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_ai_evaluation_job_contract_folder_id_idx ON public.csms_ai_evaluation_job USING btree (contract_folder_id);

--
-- Name: csms_ai_feedback_element_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_ai_feedback_element_idx ON public.csms_ai_feedback USING btree (element_code, created_at DESC);

--
-- Name: csms_ai_feedback_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_ai_feedback_folder_id_idx ON public.csms_ai_feedback USING btree (folder_id);

--
-- Name: csms_alarm_log_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_alarm_log_contract_id_idx ON public.csms_alarm_log USING btree (contract_id);

--
-- Name: csms_approval_log_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_approval_log_contract_id_idx ON public.csms_approval_log USING btree (contract_id);

--
-- Name: csms_approval_log_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_approval_log_folder_id_idx ON public.csms_approval_log USING btree (folder_id);

--
-- Name: csms_contract_folder_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_contract_folder_contract_id_idx ON public.csms_contract_folder USING btree (contract_id);

--
-- Name: csms_contract_folder_parent_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_contract_folder_parent_id_idx ON public.csms_contract_folder USING btree (parent_id);

--
-- Name: csms_contract_folder_path_gist_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_contract_folder_path_gist_idx ON public.csms_contract_folder USING gist (path);

--
-- Name: csms_evaluation_email_log_contract_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_evaluation_email_log_contract_id_idx ON public.csms_evaluation_email_log USING btree (contract_id);

--
-- Name: csms_evaluation_email_log_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_evaluation_email_log_folder_id_idx ON public.csms_evaluation_email_log USING btree (folder_id);

--
-- Name: csms_evidence_chunk_contract_folder_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX csms_evidence_chunk_contract_folder_id_idx ON public.csms_evidence_chunk USING btree (contract_folder_id);

--
-- Name: idx_sessions_token; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_token ON public.sessions USING btree (token);

--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);

--
-- Name: project_date_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX project_date_unique ON public.log_manhours USING btree (log_date, project_id) WHERE ((is_legacy = false) AND (work_location_id IS NULL));

--
-- Name: project_date_work_location_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX project_date_work_location_unique ON public.log_manhours USING btree (log_date, project_id, work_location_id) WHERE ((is_legacy = false) AND (work_location_id IS NOT NULL));

--
-- Name: vessel_date_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX vessel_date_unique ON public.log_manhours USING btree (log_date, vessel_id) WHERE (is_legacy = false);

--
-- Name: employees set_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: log_manhours set_log_manhours_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_log_manhours_updated_at BEFORE UPDATE ON public.log_manhours FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: report_files set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.report_files FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

--
-- Name: accounts accounts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: attendance attendance_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: attendance attendance_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attendance
    ADD CONSTRAINT attendance_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id) ON DELETE SET NULL;

--
-- Name: contractor_vessels contractor_vessels_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contractor_vessels
    ADD CONSTRAINT contractor_vessels_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id) ON DELETE CASCADE;

--
-- Name: contractor_vessels contractor_vessels_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contractor_vessels
    ADD CONSTRAINT contractor_vessels_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE;

--
-- Name: csms_ai_apply_log csms_ai_apply_log_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_apply_log
    ADD CONSTRAINT csms_ai_apply_log_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_ai_apply_log csms_ai_apply_log_root_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_apply_log
    ADD CONSTRAINT csms_ai_apply_log_root_id_fkey FOREIGN KEY (root_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_ai_evaluation_job csms_ai_evaluation_job_contract_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_evaluation_job
    ADD CONSTRAINT csms_ai_evaluation_job_contract_folder_id_fkey FOREIGN KEY (contract_folder_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_ai_evaluation_job csms_ai_evaluation_job_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_evaluation_job
    ADD CONSTRAINT csms_ai_evaluation_job_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);

--
-- Name: csms_ai_feedback csms_ai_feedback_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_feedback
    ADD CONSTRAINT csms_ai_feedback_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_ai_rubric_item csms_ai_rubric_item_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_ai_rubric_item
    ADD CONSTRAINT csms_ai_rubric_item_version_id_fkey FOREIGN KEY (version_id) REFERENCES public.csms_ai_rubric_version(id) ON DELETE CASCADE;

--
-- Name: csms_alarm_log csms_alarm_log_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_alarm_log
    ADD CONSTRAINT csms_alarm_log_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.csms_contract(id) ON DELETE CASCADE;

--
-- Name: csms_alarm_log csms_alarm_log_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_alarm_log
    ADD CONSTRAINT csms_alarm_log_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id) ON DELETE CASCADE;

--
-- Name: csms_approval_log csms_approval_log_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_approval_log
    ADD CONSTRAINT csms_approval_log_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.csms_contract(id) ON DELETE CASCADE;

--
-- Name: csms_approval_log csms_approval_log_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_approval_log
    ADD CONSTRAINT csms_approval_log_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_approval_log csms_approval_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_approval_log
    ADD CONSTRAINT csms_approval_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: csms_contract csms_contract_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_contract
    ADD CONSTRAINT csms_contract_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id) ON DELETE CASCADE;

--
-- Name: csms_contract_folder csms_contract_folder_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_contract_folder
    ADD CONSTRAINT csms_contract_folder_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.csms_contract(id) ON DELETE CASCADE;

--
-- Name: csms_contract_folder csms_contract_folder_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_contract_folder
    ADD CONSTRAINT csms_contract_folder_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_contract csms_contract_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_contract
    ADD CONSTRAINT csms_contract_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE;

--
-- Name: csms_evaluation_email_log csms_evaluation_email_log_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_evaluation_email_log
    ADD CONSTRAINT csms_evaluation_email_log_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.csms_contract(id) ON DELETE CASCADE;

--
-- Name: csms_evaluation_email_log csms_evaluation_email_log_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_evaluation_email_log
    ADD CONSTRAINT csms_evaluation_email_log_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_evidence_chunk csms_evidence_chunk_contract_folder_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_evidence_chunk
    ADD CONSTRAINT csms_evidence_chunk_contract_folder_id_fkey FOREIGN KEY (contract_folder_id) REFERENCES public.csms_contract_folder(id) ON DELETE CASCADE;

--
-- Name: csms_file csms_file_guideline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_file
    ADD CONSTRAINT csms_file_guideline_id_fkey FOREIGN KEY (guideline_id) REFERENCES public.csms_guideline(id) ON DELETE CASCADE;

--
-- Name: csms_file csms_file_qualification_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_file
    ADD CONSTRAINT csms_file_qualification_assessment_id_fkey FOREIGN KEY (qualification_assessment_id) REFERENCES public.csms_qualification_assessment(id) ON DELETE CASCADE;

--
-- Name: csms_file csms_file_risk_assessment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_file
    ADD CONSTRAINT csms_file_risk_assessment_id_fkey FOREIGN KEY (risk_assessment_id) REFERENCES public.csms_risk_assessment(id) ON DELETE CASCADE;

--
-- Name: csms_qualification_assessment csms_qualification_assessment_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_qualification_assessment
    ADD CONSTRAINT csms_qualification_assessment_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id) ON DELETE CASCADE;

--
-- Name: csms_risk_assessment csms_risk_assessment_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.csms_risk_assessment
    ADD CONSTRAINT csms_risk_assessment_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id) ON DELETE CASCADE;

--
-- Name: daily_report_subtypes daily_report_subtypes_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_report_subtypes
    ADD CONSTRAINT daily_report_subtypes_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: daily_report_subtypes daily_report_subtypes_subtype_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_report_subtypes
    ADD CONSTRAINT daily_report_subtypes_subtype_id_fkey FOREIGN KEY (subtype_id) REFERENCES public.subtypes(id) ON DELETE CASCADE;

--
-- Name: daily_reports daily_reports_created_by_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES public.users(id);

--
-- Name: daily_reports daily_reports_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_reports
    ADD CONSTRAINT daily_reports_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id) ON DELETE SET NULL;

--
-- Name: employee_alarm_log employee_alarm_log_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_alarm_log
    ADD CONSTRAINT employee_alarm_log_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_bpjs employee_bpjs_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_bpjs
    ADD CONSTRAINT employee_bpjs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_certificates employee_certificates_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_certificates
    ADD CONSTRAINT employee_certificates_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_contracts employee_contracts_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_contracts
    ADD CONSTRAINT employee_contracts_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_files employee_files_bpjs_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_bpjs_id_fkey FOREIGN KEY (bpjs_id) REFERENCES public.employee_bpjs(id);

--
-- Name: employee_files employee_files_certificate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_certificate_id_fkey FOREIGN KEY (certificate_id) REFERENCES public.employee_certificates(id);

--
-- Name: employee_files employee_files_contract_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.employee_contracts(id);

--
-- Name: employee_files employee_files_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_files employee_files_mcu_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_mcu_id_fkey FOREIGN KEY (mcu_id) REFERENCES public.employee_mcus(id);

--
-- Name: employee_files employee_files_sika_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_sika_id_fkey FOREIGN KEY (sika_id) REFERENCES public.employee_sika(id);

--
-- Name: employee_files employee_files_vaccination_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_files
    ADD CONSTRAINT employee_files_vaccination_id_fkey FOREIGN KEY (vaccination_id) REFERENCES public.employee_vaccinations(id);

--
-- Name: employee_mcus employee_mcus_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_mcus
    ADD CONSTRAINT employee_mcus_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_sika employee_sika_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_sika
    ADD CONSTRAINT employee_sika_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_status employee_status_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_status
    ADD CONSTRAINT employee_status_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employee_vaccinations employee_vaccinations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_vaccinations
    ADD CONSTRAINT employee_vaccinations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: employees employees_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.subtypes(id);

--
-- Name: employees employees_sub_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_sub_contractor_id_fkey FOREIGN KEY (sub_contractor_id) REFERENCES public.sub_contractors(id);

--
-- Name: employees employees_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id);

--
-- Name: log_manhours log_manhours_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_manhours
    ADD CONSTRAINT log_manhours_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id);

--
-- Name: log_manhours log_manhours_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_manhours
    ADD CONSTRAINT log_manhours_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.subtypes(id);

--
-- Name: log_manhours log_manhours_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_manhours
    ADD CONSTRAINT log_manhours_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id);

--
-- Name: log_manhours log_manhours_work_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.log_manhours
    ADD CONSTRAINT log_manhours_work_location_id_fkey FOREIGN KEY (work_location_id) REFERENCES public.work_locations(id) ON DELETE CASCADE;

--
-- Name: report_drills report_drills_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_drills
    ADD CONSTRAINT report_drills_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_files report_files_drill_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_drill_id_fkey FOREIGN KEY (drill_id) REFERENCES public.report_drills(id) ON DELETE CASCADE;

--
-- Name: report_files report_files_inspection_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_inspection_id_fkey FOREIGN KEY (inspection_id) REFERENCES public.report_inspections(id) ON DELETE CASCADE;

--
-- Name: report_files report_files_meeting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_meeting_id_fkey FOREIGN KEY (meeting_id) REFERENCES public.report_meetings(id) ON DELETE CASCADE;

--
-- Name: report_files report_files_permit_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_permit_id_fkey FOREIGN KEY (permit_id) REFERENCES public.report_permits(id) ON DELETE CASCADE;

--
-- Name: report_files report_files_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_files report_files_training_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_files
    ADD CONSTRAINT report_files_training_id_fkey FOREIGN KEY (training_id) REFERENCES public.report_trainings(id) ON DELETE CASCADE;

--
-- Name: report_highlights report_highlights_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_highlights
    ADD CONSTRAINT report_highlights_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_inspections report_inspections_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_inspections
    ADD CONSTRAINT report_inspections_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_lagging_indicators report_lagging_indicators_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_lagging_indicators
    ADD CONSTRAINT report_lagging_indicators_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_manhours report_manhours_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_manhours
    ADD CONSTRAINT report_manhours_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_meetings report_meetings_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_meetings
    ADD CONSTRAINT report_meetings_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_operations report_operations_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_operations
    ADD CONSTRAINT report_operations_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_permits report_permits_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_permits
    ADD CONSTRAINT report_permits_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_smart_cards report_smart_cards_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_smart_cards
    ADD CONSTRAINT report_smart_cards_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_trainings report_trainings_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_trainings
    ADD CONSTRAINT report_trainings_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: report_vessels_under_po_summary report_vessels_under_po_summary_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.report_vessels_under_po_summary
    ADD CONSTRAINT report_vessels_under_po_summary_report_id_fkey FOREIGN KEY (report_id) REFERENCES public.daily_reports(id) ON DELETE CASCADE;

--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: smart_card_observations smart_card_observations_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.smart_card_observations
    ADD CONSTRAINT smart_card_observations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);

--
-- Name: upload_history upload_history_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_history
    ADD CONSTRAINT upload_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: upload_observation_errors upload_observation_errors_upload_history_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upload_observation_errors
    ADD CONSTRAINT upload_observation_errors_upload_history_id_fkey FOREIGN KEY (upload_history_id) REFERENCES public.upload_history(id) ON DELETE CASCADE;

--
-- Name: user_alarm_log user_alarm_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_alarm_log
    ADD CONSTRAINT user_alarm_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: user_contractors user_contractors_contractor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contractors
    ADD CONSTRAINT user_contractors_contractor_id_fkey FOREIGN KEY (contractor_id) REFERENCES public.sub_contractors(id) ON DELETE CASCADE;

--
-- Name: user_contractors user_contractors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contractors
    ADD CONSTRAINT user_contractors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_contractors user_contractors_vessel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_contractors
    ADD CONSTRAINT user_contractors_vessel_id_fkey FOREIGN KEY (vessel_id) REFERENCES public.vessels(id) ON DELETE CASCADE;

--
-- Name: work_locations work_locations_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_locations
    ADD CONSTRAINT work_locations_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.subtypes(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

