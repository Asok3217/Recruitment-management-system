-- =========================================================
-- INTERVIEWS
-- =========================================================

CREATE TABLE public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES public.applications(id)
        ON DELETE CASCADE,

    interviewer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    interview_type public.interview_type NOT NULL,

    status public.interview_status NOT NULL DEFAULT 'scheduled',

    scheduled_at TIMESTAMPTZ NOT NULL,

    duration_minutes INTEGER NOT NULL DEFAULT 60,

    meeting_url TEXT,

    location TEXT,

    notes TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_interview_duration
        CHECK (duration_minutes > 0)
);

CREATE INDEX idx_interviews_application
ON public.interviews(application_id);

CREATE INDEX idx_interviews_interviewer
ON public.interviews(interviewer_id);

CREATE INDEX idx_interviews_scheduled
ON public.interviews(scheduled_at);





-- =========================================================
-- INTERVIEW FEEDBACK
-- =========================================================

CREATE TABLE public.interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    interview_id UUID NOT NULL
        REFERENCES public.interviews(id)
        ON DELETE CASCADE,

    interviewer_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    technical_score INTEGER,

    communication_score INTEGER,

    problem_solving_score INTEGER,

    overall_score INTEGER,

    comments TEXT,

    recommendation TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT valid_technical_score
        CHECK (
            technical_score IS NULL
            OR technical_score BETWEEN 1 AND 5
        ),

    CONSTRAINT valid_communication_score
        CHECK (
            communication_score IS NULL
            OR communication_score BETWEEN 1 AND 5
        ),

    CONSTRAINT valid_problem_solving_score
        CHECK (
            problem_solving_score IS NULL
            OR problem_solving_score BETWEEN 1 AND 5
        ),

    CONSTRAINT valid_overall_score
        CHECK (
            overall_score IS NULL
            OR overall_score BETWEEN 1 AND 5
        )
);

CREATE INDEX idx_feedback_interview
ON public.interview_feedback(interview_id);