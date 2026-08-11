-- 013_recruitment_rpcs.sql
-- Centralized recruitment workflow RPCs.
-- Candidate: withdraw + reapply only.
-- Recruiter/Admin: manage application status, notes, interviews, offers.

BEGIN;

-- =========================================================
-- 1. REMOVE DIRECT APPLICATION STATUS UPDATES
-- =========================================================
-- Status changes must go through RPCs so permission checks and
-- application_status_history are enforced in one place.

DROP POLICY IF EXISTS "Candidates can update own applications"
ON public.applications;

DROP POLICY IF EXISTS "Recruiters can update applications"
ON public.applications;

DROP POLICY IF EXISTS "Recruiters can create application history"
ON public.application_status_history;

-- Keep history readable, but do not allow clients to forge history rows.

-- =========================================================
-- 2. APPLICATION NOTES
-- =========================================================

CREATE TABLE IF NOT EXISTS public.application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    application_id UUID NOT NULL
        REFERENCES public.applications(id)
        ON DELETE CASCADE,

    author_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE RESTRICT,

    note TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT application_notes_note_not_empty
        CHECK (length(trim(note)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_application_notes_application
ON public.application_notes(application_id, created_at DESC);

ALTER TABLE public.application_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Recruiters can view application notes"
ON public.application_notes;

CREATE POLICY "Recruiters can view application notes"
ON public.application_notes
FOR SELECT
TO authenticated
USING (
    public.is_recruiter_or_admin()
);

DROP POLICY IF EXISTS "Recruiters can create application notes"
ON public.application_notes;

CREATE POLICY "Recruiters can create application notes"
ON public.application_notes
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_recruiter_or_admin()
    AND author_id = auth.uid()
);

-- =========================================================
-- 3. RECORD INITIAL APPLICATION HISTORY
-- =========================================================

CREATE OR REPLACE FUNCTION public.record_initial_application_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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
        COALESCE(auth.uid(), NEW.candidate_id),
        'Application submitted'
    );

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_record_initial_application_history
ON public.applications;

CREATE TRIGGER trg_record_initial_application_history
AFTER INSERT ON public.applications
FOR EACH ROW
EXECUTE FUNCTION public.record_initial_application_history();

-- =========================================================
-- 4. CANDIDATE STATUS RPC
-- =========================================================

DROP FUNCTION IF EXISTS public.candidate_change_application_status(UUID, public.application_status, TEXT);
DROP FUNCTION IF EXISTS public.candidate_change_application_status(UUID, public.application_status);

CREATE OR REPLACE FUNCTION public.candidate_change_application_status(
    p_application_id UUID,
    p_new_status public.application_status
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_application public.applications;
    v_old_status public.application_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    SELECT *
    INTO v_application
    FROM public.applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    IF v_application.candidate_id <> auth.uid() THEN
        RAISE EXCEPTION 'You do not have permission to update this application';
    END IF;

    v_old_status := v_application.status;

    -- Candidate is allowed only:
    -- active application -> withdrawn
    -- withdrawn -> applied
    IF p_new_status = 'withdrawn' THEN
        IF v_old_status IN ('rejected', 'hired', 'withdrawn') THEN
            RAISE EXCEPTION 'This application cannot be withdrawn from its current status';
        END IF;
    ELSIF p_new_status = 'applied' THEN
        IF v_old_status <> 'withdrawn' THEN
            RAISE EXCEPTION 'Candidates can only reapply to a withdrawn application';
        END IF;
    ELSE
        RAISE EXCEPTION 'Candidates can only withdraw or reapply';
    END IF;

    IF v_old_status = p_new_status THEN
        RETURN v_application;
    END IF;

    UPDATE public.applications
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_application_id
    RETURNING * INTO v_application;

    INSERT INTO public.application_status_history (
        application_id,
        old_status,
        new_status,
        changed_by,
        notes
    )
    VALUES (
        p_application_id,
        v_old_status,
        p_new_status,
        auth.uid(),
        CASE
            WHEN p_new_status = 'withdrawn' THEN 'Candidate withdrew application'
            WHEN p_new_status = 'applied' THEN 'Candidate reapplied'
            ELSE NULL
        END
    );

    RETURN v_application;
END;
$$;

REVOKE ALL ON FUNCTION public.candidate_change_application_status(UUID, public.application_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.candidate_change_application_status(UUID, public.application_status) TO authenticated;

-- =========================================================
-- 5. RECRUITER/ADMIN STATUS RPC
-- =========================================================

DROP FUNCTION IF EXISTS public.recruiter_update_application_status(UUID, public.application_status, TEXT);

CREATE OR REPLACE FUNCTION public.recruiter_update_application_status(
    p_application_id UUID,
    p_new_status public.application_status,
    p_notes TEXT DEFAULT NULL
)
RETURNS public.applications
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_application public.applications;
    v_old_status public.application_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_recruiter_or_admin() THEN
        RAISE EXCEPTION 'Only recruiters and admins can change application status';
    END IF;

    SELECT *
    INTO v_application
    FROM public.applications
    WHERE id = p_application_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    v_old_status := v_application.status;

    IF v_old_status = p_new_status THEN
        RETURN v_application;
    END IF;

    UPDATE public.applications
    SET
        status = p_new_status,
        updated_at = NOW()
    WHERE id = p_application_id
    RETURNING * INTO v_application;

    INSERT INTO public.application_status_history (
        application_id,
        old_status,
        new_status,
        changed_by,
        notes
    )
    VALUES (
        p_application_id,
        v_old_status,
        p_new_status,
        auth.uid(),
        p_notes
    );

    RETURN v_application;
END;
$$;

REVOKE ALL ON FUNCTION public.recruiter_update_application_status(UUID, public.application_status, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recruiter_update_application_status(UUID, public.application_status, TEXT) TO authenticated;

-- =========================================================
-- 6. RECRUITER APPLICATION NOTE RPC
-- =========================================================

DROP FUNCTION IF EXISTS public.recruiter_add_application_note(UUID, TEXT);

CREATE OR REPLACE FUNCTION public.recruiter_add_application_note(
    p_application_id UUID,
    p_note TEXT
)
RETURNS public.application_notes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_note public.application_notes;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_recruiter_or_admin() THEN
        RAISE EXCEPTION 'Only recruiters and admins can add application notes';
    END IF;

    IF p_note IS NULL OR length(trim(p_note)) = 0 THEN
        RAISE EXCEPTION 'Note cannot be empty';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.applications
        WHERE id = p_application_id
    ) THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    INSERT INTO public.application_notes (
        application_id,
        author_id,
        note
    )
    VALUES (
        p_application_id,
        auth.uid(),
        trim(p_note)
    )
    RETURNING * INTO v_note;

    RETURN v_note;
END;
$$;

REVOKE ALL ON FUNCTION public.recruiter_add_application_note(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recruiter_add_application_note(UUID, TEXT) TO authenticated;

-- =========================================================
-- 7. RECRUITER SCHEDULE INTERVIEW RPC
-- =========================================================

DROP FUNCTION IF EXISTS public.recruiter_schedule_interview(UUID, public.interview_type, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.recruiter_schedule_interview(
    p_application_id UUID,
    p_interview_type public.interview_type,
    p_scheduled_at TIMESTAMPTZ,
    p_duration_minutes INTEGER DEFAULT 60,
    p_meeting_url TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_interviewer_id UUID DEFAULT NULL
)
RETURNS public.interviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_interview public.interviews;
    v_interviewer_id UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_recruiter_or_admin() THEN
        RAISE EXCEPTION 'Only recruiters and admins can schedule interviews';
    END IF;

    IF p_duration_minutes <= 0 THEN
        RAISE EXCEPTION 'Interview duration must be greater than zero';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.applications
        WHERE id = p_application_id
    ) THEN
        RAISE EXCEPTION 'Application not found';
    END IF;

    v_interviewer_id := COALESCE(p_interviewer_id, auth.uid());

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = v_interviewer_id
          AND role IN ('recruiter', 'admin')
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Interviewer must be an active recruiter or admin';
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
        v_interviewer_id,
        p_interview_type,
        'scheduled',
        p_scheduled_at,
        p_duration_minutes,
        p_meeting_url,
        p_location,
        p_notes
    )
    RETURNING * INTO v_interview;

    PERFORM public.recruiter_update_application_status(
        p_application_id,
        'interview',
        'Interview scheduled'
    );

    RETURN v_interview;
END;
$$;

REVOKE ALL ON FUNCTION public.recruiter_schedule_interview(UUID, public.interview_type, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recruiter_schedule_interview(UUID, public.interview_type, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- =========================================================
-- 8. RECRUITER UPDATE INTERVIEW RPC
-- =========================================================

DROP FUNCTION IF EXISTS public.recruiter_update_interview(UUID, public.interview_status, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.recruiter_update_interview(
    p_interview_id UUID,
    p_status public.interview_status DEFAULT NULL,
    p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
    p_duration_minutes INTEGER DEFAULT NULL,
    p_meeting_url TEXT DEFAULT NULL,
    p_location TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_interviewer_id UUID DEFAULT NULL
)
RETURNS public.interviews
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_interview public.interviews;
    v_new_status public.interview_status;
    v_new_interviewer UUID;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_recruiter_or_admin() THEN
        RAISE EXCEPTION 'Only recruiters and admins can update interviews';
    END IF;

    SELECT *
    INTO v_interview
    FROM public.interviews
    WHERE id = p_interview_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Interview not found';
    END IF;

    IF p_duration_minutes IS NOT NULL AND p_duration_minutes <= 0 THEN
        RAISE EXCEPTION 'Interview duration must be greater than zero';
    END IF;

    v_new_status := COALESCE(p_status, v_interview.status);
    v_new_interviewer := COALESCE(p_interviewer_id, v_interview.interviewer_id);

    IF p_interviewer_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = v_new_interviewer
          AND role IN ('recruiter', 'admin')
          AND is_active = TRUE
    ) THEN
        RAISE EXCEPTION 'Interviewer must be an active recruiter or admin';
    END IF;

    UPDATE public.interviews
    SET
        status = v_new_status,
        scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
        duration_minutes = COALESCE(p_duration_minutes, duration_minutes),
        meeting_url = COALESCE(p_meeting_url, meeting_url),
        location = COALESCE(p_location, location),
        notes = COALESCE(p_notes, notes),
        interviewer_id = v_new_interviewer,
        updated_at = NOW()
    WHERE id = p_interview_id
    RETURNING * INTO v_interview;

    RETURN v_interview;
END;
$$;

REVOKE ALL ON FUNCTION public.recruiter_update_interview(UUID, public.interview_status, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recruiter_update_interview(UUID, public.interview_status, TIMESTAMPTZ, INTEGER, TEXT, TEXT, TEXT, UUID) TO authenticated;

-- =========================================================
-- 9. RECRUITER SEND OFFER RPC
-- =========================================================

DROP FUNCTION IF EXISTS public.recruiter_send_offer(UUID, NUMERIC, DATE, DATE, TEXT);

CREATE OR REPLACE FUNCTION public.recruiter_send_offer(
    p_application_id UUID,
    p_salary NUMERIC,
    p_start_date DATE DEFAULT NULL,
    p_expiry_date DATE DEFAULT NULL,
    p_terms TEXT DEFAULT NULL
)
RETURNS public.offers
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_offer public.offers;
    v_job_title TEXT;
    v_candidate_id UUID;
    v_old_status public.application_status;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;

    IF NOT public.is_recruiter_or_admin() THEN
        RAISE EXCEPTION 'Only recruiters and admins can send offers';
    END IF;

    IF p_salary < 0 THEN
        RAISE EXCEPTION 'Offer salary cannot be negative';
    END IF;

    IF p_expiry_date IS NOT NULL
       AND p_start_date IS NOT NULL
       AND p_expiry_date < p_start_date THEN
        RAISE EXCEPTION 'Offer expiry date cannot be before the start date';
    END IF;

    SELECT
        j.title,
        a.candidate_id,
        a.status
    INTO
        v_job_title,
        v_candidate_id,
        v_old_status
    FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.id = p_application_id
    FOR UPDATE OF a;

    IF NOT FOUND THEN
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
        v_job_title,
        p_salary,
        p_start_date,
        p_expiry_date,
        p_terms,
        'sent',
        NOW()
    )
    RETURNING * INTO v_offer;

    PERFORM public.recruiter_update_application_status(
        p_application_id,
        'offer_sent',
        'Offer sent to candidate'
    );

    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        link
    )
    VALUES (
        v_candidate_id,
        'offer',
        'New job offer',
        'You have received an offer for ' || v_job_title || '.',
        '/candidate/applications/' || p_application_id::TEXT
    );

    RETURN v_offer;
END;
$$;

REVOKE ALL ON FUNCTION public.recruiter_send_offer(UUID, NUMERIC, DATE, DATE, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recruiter_send_offer(UUID, NUMERIC, DATE, DATE, TEXT) TO authenticated;

-- =========================================================
-- 10. RETIRE THE OLD GENERIC STATUS RPC FROM THE CLIENT
-- =========================================================

REVOKE EXECUTE ON FUNCTION public.change_application_status(UUID, public.application_status, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.change_application_status(UUID, public.application_status, TEXT) FROM authenticated;

COMMIT;