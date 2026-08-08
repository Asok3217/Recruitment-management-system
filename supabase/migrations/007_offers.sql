-- =========================================================
-- OFFERS
-- =========================================================

CREATE TABLE public.offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES public.applications(id)
        ON DELETE CASCADE,

    created_by UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    job_title TEXT NOT NULL,

    salary NUMERIC(12, 2) NOT NULL,

    start_date DATE,

    expiry_date DATE,

    terms TEXT,

    status public.offer_status NOT NULL DEFAULT 'draft',

    sent_at TIMESTAMPTZ,

    responded_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_offer_salary
        CHECK (salary >= 0)
);

CREATE INDEX idx_offers_application
ON public.offers(application_id);

CREATE INDEX idx_offers_status
ON public.offers(status);