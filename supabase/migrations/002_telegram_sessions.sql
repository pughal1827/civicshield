-- Create the telegram_sessions table for conversational state tracking
CREATE TABLE IF NOT EXISTS public.telegram_sessions (
    chat_id BIGINT PRIMARY KEY,
    state TEXT NOT NULL,
    temp_data JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS (though mostly used server-side by the webhook)
ALTER TABLE public.telegram_sessions ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Enable ALL for service role" ON public.telegram_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
