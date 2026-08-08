-- =========================================================
-- JOBS
-- =========================================================

CREATE TABLE public.jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    description TEXT NOT NULL,

    requirements TEXT,

    responsibilities TEXT,

    department_id UUID REFERENCES public.departments(id)
        ON DELETE SET NULL,

    created_by UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    location TEXT,

    employment_type public.employment_type NOT NULL,

    experience_level public.experience_level,

    salary_min NUMERIC(12, 2),

    salary_max NUMERIC(12, 2),

    application_deadline DATE,

    status public.job_status NOT NULL DEFAULT 'draft',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_salary_range
        CHECK (
            salary_min IS NULL
            OR salary_max IS NULL
            OR salary_min <= salary_max
        )
);

CREATE INDEX idx_jobs_department
ON public.jobs(department_id);

CREATE INDEX idx_jobs_created_by
ON public.jobs(created_by);

CREATE INDEX idx_jobs_status
ON public.jobs(status);

CREATE INDEX idx_jobs_deadline
ON public.jobs(application_deadline);