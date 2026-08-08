-- =========================================================
-- APPLICATIONS
-- =========================================================

CREATE TABLE public.applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id UUID NOT NULL REFERENCES public.jobs(id)
        ON DELETE CASCADE,

    candidate_id UUID NOT NULL REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    resume_url TEXT,

    cover_letter TEXT,

    status public.application_status NOT NULL DEFAULT 'applied',

    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(job_id, candidate_id)
);

CREATE INDEX idx_applications_job
ON public.applications(job_id);

CREATE INDEX idx_applications_candidate
ON public.applications(candidate_id);

CREATE INDEX idx_applications_status
ON public.applications(status);


-- =========================================================
-- APPLICATION STATUS HISTORY
-- =========================================================

CREATE TABLE public.application_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES public.applications(id)
        ON DELETE CASCADE,

    old_status public.application_status,

    new_status public.application_status NOT NULL,

    changed_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_application_history_application
ON public.application_status_history(application_id);