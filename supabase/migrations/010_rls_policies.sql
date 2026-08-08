-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;



-- =========================================================
-- HELPER FUNCTIONS
-- =========================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role
    FROM public.profiles
    WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'admin'
    );
$$;

CREATE OR REPLACE FUNCTION public.is_recruiter()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role = 'recruiter'
    );
$$;


-- profile policies
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
USING (
    id = auth.uid()
    OR public.is_admin()
);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (
    id = auth.uid()
    OR public.is_admin()
);

--for department
CREATE POLICY "Anyone authenticated can view departments"
ON public.departments
FOR SELECT
TO authenticated
USING (
    is_active = TRUE
    OR public.is_admin()
);

CREATE POLICY "Admins can manage departments"
ON public.departments
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

--jobs
CREATE POLICY "Anyone can view published jobs"
ON public.jobs
FOR SELECT
USING (
    status = 'published'
    OR created_by = auth.uid()
    OR public.is_admin()
    OR public.is_recruiter()
);



-- for recruiters

CREATE POLICY "Recruiters can create jobs"
ON public.jobs
FOR INSERT
TO authenticated
WITH CHECK (
    public.is_recruiter()
    AND created_by = auth.uid()
);


CREATE POLICY "Recruiters can update own jobs"
ON public.jobs
FOR UPDATE
TO authenticated
USING (
    created_by = auth.uid()
    OR public.is_admin()
)
WITH CHECK (
    created_by = auth.uid()
    OR public.is_admin()
);


--application rls
CREATE POLICY "Candidates can view own applications"
ON public.applications
FOR SELECT
TO authenticated
USING (
    candidate_id = auth.uid()
    OR public.is_recruiter()
    OR public.is_admin()
);


-- for candidates

CREATE POLICY "Candidates can create applications"
ON public.applications
FOR INSERT
TO authenticated
WITH CHECK (
    candidate_id = auth.uid()
    AND public.get_user_role() = 'candidate'
);


-- update
CREATE POLICY "Candidates can update own applications"
ON public.applications
FOR UPDATE
TO authenticated
USING (
    candidate_id = auth.uid()
)
WITH CHECK (
    candidate_id = auth.uid()
);


-- Notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR public.is_admin()
);


-- update
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid()
)
WITH CHECK (
    user_id = auth.uid()
);