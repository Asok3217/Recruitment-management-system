-- =========================================================
-- NOTIFICATIONS
-- =========================================================

CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES public.profiles(id)
        ON DELETE CASCADE,

    type public.notification_type NOT NULL,

    title TEXT NOT NULL,

    message TEXT NOT NULL,

    link TEXT,

    is_read BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user
ON public.notifications(user_id);

CREATE INDEX idx_notifications_unread
ON public.notifications(user_id, is_read);

CREATE INDEX idx_notifications_created
ON public.notifications(created_at DESC);