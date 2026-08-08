-- =========================================================
-- ENUM TYPES
-- Recruitment Management System
-- =========================================================

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'recruiter',
    'candidate'
);

CREATE TYPE public.job_status AS ENUM (
    'draft',
    'published',
    'closed',
    'archived'
);

CREATE TYPE public.employment_type AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'internship'
);

CREATE TYPE public.experience_level AS ENUM (
    'entry',
    'mid',
    'senior',
    'lead'
);

CREATE TYPE public.application_status AS ENUM (
    'applied',
    'screening',
    'shortlisted',
    'interview',
    'selected',
    'rejected',
    'withdrawn',
    'offer_sent',
    'hired'
);

CREATE TYPE public.interview_type AS ENUM (
    'phone',
    'video',
    'in_person',
    'technical',
    'hr'
);

CREATE TYPE public.interview_status AS ENUM (
    'scheduled',
    'completed',
    'cancelled',
    'rescheduled'
);

CREATE TYPE public.offer_status AS ENUM (
    'draft',
    'sent',
    'accepted',
    'rejected',
    'expired',
    'withdrawn'
);

CREATE TYPE public.notification_type AS ENUM (
    'application',
    'interview',
    'offer',
    'job',
    'system'
);