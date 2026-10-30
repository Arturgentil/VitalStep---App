BEGIN;

-- Remove permissões públicas e anônimas das tabelas.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon;

-- Permite que usuários autenticados utilizem o schema.
GRANT USAGE ON SCHEMA public TO authenticated;

-- Permissões necessárias para as tabelas protegidas por RLS.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
    public.stepvolt_profiles,
    public.shoe_devices,
    public.activities,
    public.measurements,
    public.energy_logs,
    public.device_events,
    public.health_notes,
    public.safety_events,
    public.emergency_contacts,
    public.goals,
    public.achievements,
    public.challenges,
    public.challenge_participants,
    public.post_likes,
    public.comments,
    public.reports
TO authenticated;

-- Posts: permissões gerais, exceto UPDATE irrestrito.
GRANT SELECT, INSERT, DELETE ON TABLE public.posts TO authenticated;

REVOKE UPDATE ON public.posts FROM authenticated;

-- Somente estas colunas podem ser atualizadas pelo cliente.
GRANT UPDATE (
    challenge_id,
    author_name,
    title,
    body,
    activity_kind,
    distance_m,
    duration_s,
    steps,
    energy_mwh,
    visibility
) ON public.posts TO authenticated;

COMMIT;
