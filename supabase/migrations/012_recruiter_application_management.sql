-- =========================================================
-- RECRUITER / ADMIN APPLICATION MANAGEMENT
-- Migration: 011_recruiter_application_management.sql
-- =========================================================

-- =========================================================
-- 1. APPLICATION STATUS HISTORY TRIGGER
--
-- Automatically records:
--   application creation
--   status changes
--
-- Notes can be supplied by the secure RPC functions below.
-- =========================================================

CREATE OR REPLACE FUNCTION public.log_application_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    actor_id UUID;
    history_note TEXT;
BEGIN
    actor_id := COALESCE(auth.uid(), NEW.candidate_id);

    history_note := NULLIF(
        current_setting('app.application_note', true),
        ''
    );

    IF TG_OP = 'INSERT' THEN

        INSERT INTO public.application_status_history (
            application_id,
            old_status,
            new_status,
            changed_by,
            notes
        )
        VALUES (
            NEW.id,
            NULL,
            NEW.status,
            actor_id,
            NULL
        );

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE'
       AND NEW.status IS DISTINCT FROM OLD.status THEN

        INSERT INTO public.application_status_history (
            application_id,
            old_status,
            new_status,
            changed_by,
            notes
        )
        VALUES (
            NEW.id,
            OLD.status,
            NEW.status,
            actor_id,
            history_note
        );

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS application_status_history_trigger
ON public.applications;

CREATE TRIGGER application_status_history_trigger
AFTER INSERT OR UPDATE OF status
ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.log_application_status_change();


-- =========================================================
-- 2. PROFILE ACCESS
--
-- Recruiters can view candidate profiles only when the
-- candidate has applied to one of their jobs.
-- =========================================================

DROP POLICY IF EXISTS "Users can view own profile"
ON public.profiles;

CREATE POLICY "Users can view permitted profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR public.is_admin()
    OR (
        public.is_recruiter()
        AND EXISTS (
            SELECT 1
            FROM public.applications a
            INNER JOIN public.jobs j
                ON j.id = a.job_id
            WHERE a.candidate_id = profiles.id
              AND j.created_by = auth.uid()
        )
    )
);


-- =========================================================
-- 3. APPLICATION VISIBILITY
--
-- Candidates:
--   own applications
--
-- Recruiters:
--   applications belonging to their jobs
--
-- Admins:
--   all applications
-- =========================================================

DROP POLICY IF EXISTS "Candidates can view own applications"
ON public.applications;

CREATE POLICY "Permitted users can view applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
    candidate_id = auth.uid()
    OR public.is_admin()
    OR (
        public.is_recruiter()
        AND EXISTS (
            SELECT 1
            FROM public.jobs j
            WHERE j.id = applications.job_id
              AND j.created_by = auth.uid()
        )
    )
);


-- =========================================================
-- 4. REMOVE DIRECT CANDIDATE APPLICATION UPDATES
--
-- Candidates must use the safe RPC functions below.
-- This prevents a browser/client from directly changing
-- screening/shortlisted/interview/etc.
-- =========================================================

DROP POLICY IF EXISTS "Candidates can update own applications"
ON public.applications;


-- =========================================================
-- 5. APPLICATION HISTORY VISIBILITY
-- =========================================================

CREATE POLICY "Permitted users can view application history"
ON public.application_status_history
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = application_status_history.application_id
          AND (
              a.candidate_id = auth.uid()
              OR public.is_admin()
              OR (
                  public.is_recruiter()
                  AND EXISTS (
                      SELECT 1
                      FROM public.jobs j
                      WHERE j.id = a.job_id
                        AND j.created_by = auth.uid()
                  )
              )
          )
    )
);


-- =========================================================
-- 6. INTERVIEW VISIBILITY
-- =========================================================

CREATE POLICY "Permitted users can view interviews"
ON public.interviews
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = interviews.application_id
          AND (
              a.candidate_id = auth.uid()
              OR public.is_admin()
              OR (
                  public.is_recruiter()
                  AND EXISTS (
                      SELECT 1
                      FROM public.jobs j
                      WHERE j.id = a.job_id
                        AND j.created_by = auth.uid()
                  )
              )
          )
    )
);


-- =========================================================
-- 7. OFFER VISIBILITY
-- =========================================================

CREATE POLICY "Permitted users can view offers"
ON public.offers
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.applications a
        WHERE a.id = offers.application_id
          AND (
              a.candidate_id = auth.uid()
              OR public.is_admin()
              OR (
                  public.is_recruiter()
                  AND EXISTS (
                      SELECT 1
                      FROM public.jobs j
                      WHERE j.id = a.job_id
                        AND j.created_by = auth.uid()
                  )
              )
          )
    )
);


-- =========================================================
-- 8. CANDIDATE WITHDRAW / REAPPLY
--
-- Candidates cannot UPDATE applications directly.
-- These functions expose only the two permitted transitions.
-- =========================================================

CREATE OR REPLACE FUNCTION public.candidate_change_application_status(
    p_application_id UUID,
    p_new_status public.application_status
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_status public.application_status;
    candidate_application_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'candidate'
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Only candidates can perform this action';
    END IF;

    SELECT
        a.status,
        a.candidate_id
    INTO
        current_status,
        candidate_application_id
    FROM public.applications a
    WHERE a.id = p_application_id
      AND a.candidate_id = auth.uid()
    FOR UPDATE;

    IF candidate_application_id IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    IF p_new_status = 'withdrawn' THEN

        IF current_status NOT IN (
            'applied',
            'screening',
            'shortlisted',
            'interview',
            'offer_sent'
        ) THEN
            RAISE EXCEPTION
                'This application cannot be withdrawn at its current stage';
        END IF;

    ELSIF p_new_status = 'applied' THEN

        IF current_status <> 'withdrawn' THEN
            RAISE EXCEPTION
                'Only withdrawn applications can be reapplied';
        END IF;

    ELSE
        RAISE EXCEPTION
            'Candidates cannot set recruitment statuses';
    END IF;

    UPDATE public.applications
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_application_id
      AND candidate_id = auth.uid();

    RETURN p_application_id;
END;
$$;


-- =========================================================
-- 9. RECRUITER / ADMIN AUTHORIZATION HELPER
-- =========================================================

CREATE OR REPLACE FUNCTION public.can_manage_application(
    p_application_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.applications a
        INNER JOIN public.jobs j
            ON j.id = a.job_id
        WHERE a.id = p_application_id
          AND (
              (
                  public.is_admin()
              )
              OR (
                  public.is_recruiter()
                  AND j.created_by = auth.uid()
              )
          )
    );
$$;


-- =========================================================
-- 10. RECRUITER / ADMIN STATUS CHANGE
-- =========================================================

CREATE OR REPLACE FUNCTION public.recruiter_update_application_status(
    p_application_id UUID,
    p_new_status public.application_status,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_status public.application_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.can_manage_application(p_application_id) THEN
        RAISE EXCEPTION 'You are not authorized to manage this application';
    END IF;

    SELECT status
    INTO current_status
    FROM public.applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    IF current_status = 'withdrawn' THEN
        RAISE EXCEPTION
            'Withdrawn applications must be reapplied by the candidate';
    END IF;

    PERFORM set_config(
        'app.application_note',
        COALESCE(p_notes, ''),
        true
    );

    UPDATE public.applications
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_application_id;

    RETURN p_application_id;
END;
$$;


-- =========================================================
-- 11. RECRUITER / ADMIN NOTE
--
-- A note creates a history event without changing status.
-- =========================================================

CREATE OR REPLACE FUNCTION public.recruiter_add_application_note(
    p_application_id UUID,
    p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    current_status public.application_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.can_manage_application(p_application_id) THEN
        RAISE EXCEPTION 'You are not authorized to manage this application';
    END IF;

    IF p_notes IS NULL OR length(trim(p_notes)) = 0 THEN
        RAISE EXCEPTION 'Note cannot be empty';
    END IF;

    SELECT status
    INTO current_status
    FROM public.applications
    WHERE id = p_application_id;

    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    INSERT INTO public.application_status_history (
        application_id,
        old_status,
        new_status,
        changed_by,
        notes
    )
    VALUES (
        p_application_id,
        current_status,
        current_status,
        auth.uid(),
        trim(p_notes)
    );

    RETURN p_application_id;
END;
$$;


-- =========================================================
-- 12. SCHEDULE INTERVIEW
-- =========================================================

CREATE OR REPLACE FUNCTION public.recruiter_schedule_interview(
    p_application_id UUID,
    p_interview_type public.interview_type,
    p_scheduled_at TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 60,
    p_meeting_url TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    interview_id UUID;
    current_status public.application_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.can_manage_application(p_application_id) THEN
        RAISE EXCEPTION 'You are not authorized to manage this application';
    END IF;

    IF p_duration_minutes <= 0 THEN
        RAISE EXCEPTION 'Interview duration must be greater than zero';
    END IF;

    SELECT status
    INTO current_status
    FROM public.applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF current_status IS NULL THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    IF current_status IN (
        'withdrawn',
        'rejected',
        'hired'
    ) THEN
        RAISE EXCEPTION
            'An interview cannot be scheduled for this application';
    END IF;

    INSERT INTO public.interviews (
        application_id,
        interviewer_id,
        interview_type,
        status,
        scheduled_at,
        duration_minutes,
        meeting_url,
        location,
        notes
    )
    VALUES (
        p_application_id,
        auth.uid(),
        p_interview_type,
        'scheduled',
        p_scheduled_at,
        p_duration_minutes,
        NULLIF(trim(p_meeting_url), ''),
        NULLIF(trim(p_location), ''),
        NULLIF(trim(p_notes), '')
    )
    RETURNING id INTO interview_id;

    PERFORM set_config(
        'app.application_note',
        COALESCE(p_notes, 'Interview scheduled'),
        true
    );

    UPDATE public.applications
    SET
        status = 'interview',
        updated_at = NOW()
    WHERE id = p_application_id;

    RETURN interview_id;
END;
$$;


-- =========================================================
-- 13. MANAGE INTERVIEW
-- =========================================================

CREATE OR REPLACE FUNCTION public.recruiter_update_interview(
    p_interview_id UUID,
    p_status public.interview_status,
    p_scheduled_at TIMESTAMPTZ,
    p_duration_minutes INTEGER,
    p_meeting_url TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    application_id_value UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT i.application_id
    INTO application_id_value
    FROM public.interviews i
    WHERE i.id = p_interview_id;

    IF application_id_value IS NULL THEN
        RAISE EXCEPTION 'Interview not found';
    END IF;

    IF NOT public.can_manage_application(application_id_value) THEN
        RAISE EXCEPTION 'You are not authorized to manage this interview';
    END IF;

    IF p_duration_minutes <= 0 THEN
        RAISE EXCEPTION 'Interview duration must be greater than zero';
    END IF;

    UPDATE public.interviews
    SET
        status = p_status,
        scheduled_at = p_scheduled_at,
        duration_minutes = p_duration_minutes,
        meeting_url = NULLIF(trim(p_meeting_url), ''),
        location = NULLIF(trim(p_location), ''),
        notes = NULLIF(trim(p_notes), ''),
        updated_at = NOW()
    WHERE id = p_interview_id;

    RETURN p_interview_id;
END;
$$;


-- =========================================================
-- 14. SEND OFFER
-- =========================================================

CREATE OR REPLACE FUNCTION public.recruiter_send_offer(
    p_application_id UUID,
    p_salary NUMERIC,
    p_start_date DATE DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_terms TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    offer_id UUID;
    job_title_value TEXT;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.can_manage_application(p_application_id) THEN
        RAISE EXCEPTION 'You are not authorized to manage this application';
    END IF;

    IF p_salary < 0 THEN
        RAISE EXCEPTION 'Offer salary cannot be negative';
    END IF;

    IF p_expiry_date IS NOT NULL
       AND p_start_date IS NOT NULL
       AND p_expiry_date < p_start_date THEN
        RAISE EXCEPTION
            'Offer expiry date cannot be before the start date';
    END IF;

    SELECT j.title
    INTO job_title_value
    FROM public.applications a
    INNER JOIN public.jobs j
        ON j.id = a.job_id
    WHERE a.id = p_application_id;

    IF job_title_value IS NULL THEN
        RAISE EXCEPTION 'Application or job not found';
    END IF;

    INSERT INTO public.offers (
        application_id,
        created_by,
        job_title,
        salary,
        start_date,
        expiry_date,
        terms,
        status,
        sent_at
    )
    VALUES (
        p_application_id,
        auth.uid(),
        job_title_value,
        p_salary,
        p_start_date,
        p_expiry_date,
        NULLIF(trim(p_terms), ''),
        'sent',
        NOW()
    )
    RETURNING id INTO offer_id;

    PERFORM set_config(
        'app.application_note',
        'Offer sent',
        true
    );

    UPDATE public.applications
    SET
        status = 'offer_sent',
        updated_at = NOW()
    WHERE id = p_application_id;

    RETURN offer_id;
END;
$$;


-- =========================================================
-- 15. FUNCTION PERMISSIONS
-- =========================================================

REVOKE EXECUTE
ON FUNCTION public.candidate_change_application_status(UUID, public.application_status)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.recruiter_update_application_status(
    UUID,
    public.application_status,
    TEXT
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.recruiter_add_application_note(UUID, TEXT)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.recruiter_schedule_interview(
    UUID,
    public.interview_type,
    TIMESTAMPTZ,
    INTEGER,
    TEXT,
    TEXT,
    TEXT
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.recruiter_update_interview(
    UUID,
    public.interview_status,
    TIMESTAMPTZ,
    INTEGER,
    TEXT,
    TEXT,
    TEXT
)
FROM PUBLIC;

REVOKE EXECUTE
ON FUNCTION public.recruiter_send_offer(
    UUID,
    NUMERIC,
    DATE,
    DATE,
    TEXT
)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.candidate_change_application_status(
    UUID,
    public.application_status
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.recruiter_update_application_status(
    UUID,
    public.application_status,
    TEXT
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.recruiter_add_application_note(
    UUID,
    TEXT
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.recruiter_schedule_interview(
    UUID,
    public.interview_type,
    TIMESTAMPTZ,
    INTEGER,
    TEXT,
    TEXT,
    TEXT
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.recruiter_update_interview(
    UUID,
    public.interview_status,
    TIMESTAMPTZ,
    INTEGER,
    TEXT,
    TEXT,
    TEXT
)
TO authenticated;

GRANT EXECUTE
ON FUNCTION public.recruiter_send_offer(
    UUID,
    NUMERIC,
    DATE,
    DATE,
    TEXT
)
TO authenticated;


-- =========================================================
-- 16. INDEXES FOR RECRUITER QUERIES
-- =========================================================

CREATE INDEX IF NOT EXISTS idx_jobs_created_by_status
ON public.jobs(created_by, status);

CREATE INDEX IF NOT EXISTS idx_applications_job_status
ON public.applications(job_id, status);

CREATE INDEX IF NOT EXISTS idx_history_application_created
ON public.application_status_history(
    application_id,
    created_at DESC
);

CREATE INDEX IF NOT EXISTS idx_interviews_application_scheduled
ON public.interviews(
    application_id,
    scheduled_at DESC
);

CREATE INDEX IF NOT EXISTS idx_offers_application_created
ON public.offers(
    application_id,
    created_at DESC
);
