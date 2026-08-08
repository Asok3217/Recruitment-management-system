-- =========================================================
-- AUDIT LOGS
-- =========================================================

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID REFERENCES public.profiles(id)
        ON DELETE SET NULL,

    action TEXT NOT NULL,

    entity_type TEXT NOT NULL,

    entity_id UUID,

    old_data JSONB,

    new_data JSONB,

    ip_address INET,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user
ON public.audit_logs(user_id);

CREATE INDEX idx_audit_logs_entity
ON public.audit_logs(entity_type, entity_id);

CREATE INDEX idx_audit_logs_created
ON public.audit_logs(created_at DESC);