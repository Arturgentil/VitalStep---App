BEGIN;

CREATE TABLE public.ai_usage (
    operator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_date date NOT NULL,
    request_count integer NOT NULL DEFAULT 0
        CHECK (request_count >= 0),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (operator_id, usage_date)
);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ai_usage
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE public.ai_usage
TO service_role;

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
    p_operator_id uuid,
    p_usage_date date,
    p_daily_limit integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count integer;
BEGIN
    IF p_operator_id IS NULL
       OR p_usage_date IS NULL
       OR p_daily_limit IS NULL
       OR p_daily_limit < 1 THEN
        RAISE EXCEPTION 'Parâmetros inválidos.';
    END IF;

    INSERT INTO public.ai_usage (
        operator_id,
        usage_date,
        request_count
    )
    VALUES (
        p_operator_id,
        p_usage_date,
        1
    )
    ON CONFLICT (operator_id, usage_date)
    DO UPDATE SET
        request_count = public.ai_usage.request_count + 1,
        updated_at = now()
    WHERE public.ai_usage.request_count < p_daily_limit
    RETURNING request_count INTO v_count;

    RETURN COALESCE(v_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ai_usage(uuid, date, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, date, integer)
TO service_role;

COMMIT;
