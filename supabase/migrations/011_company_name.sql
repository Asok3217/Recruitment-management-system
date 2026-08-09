-- =========================================================
-- COMPANIES
-- Recruitment Management System
-- =========================================================

CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name TEXT NOT NULL,

    logo_url TEXT,

    website_url TEXT,

    description TEXT,

    location TEXT,

    industry TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_companies_name
ON public.companies(name);


-- =========================================================
-- ADD COMPANY TO JOBS
-- =========================================================

ALTER TABLE public.jobs
ADD COLUMN company_id UUID;

ALTER TABLE public.jobs
ADD CONSTRAINT jobs_company_id_fkey
FOREIGN KEY (company_id)
REFERENCES public.companies(id)
ON DELETE SET NULL;

CREATE INDEX idx_jobs_company_id
ON public.jobs(company_id);