-- =========================================================
-- VitalStep | PostgreSQL / Supabase
-- Migration 001: Initial database schema
-- =========================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------
-- 1. USER PROFILES
-- auth.users is the identity provider.
-- ---------------------------------------------------------

create table public.vitalstep_profiles (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null unique references auth.users(id) on delete cascade,
    display_name text,
    birth_year integer check (birth_year between 1900 and 2100),
    height_cm numeric(6,2) check (height_cm > 0),
    weight_kg numeric(6,2) check (weight_kg > 0),
    sex text check (sex in ('female','male','other','undisclosed')),
    daily_step_goal numeric default 8000,
    daily_energy_goal_mwh numeric default 120,
    weekly_minutes_goal numeric default 150,
    onboarded boolean not null default false,
    public_profile boolean not null default false,
    share_routes boolean not null default false,
    share_health boolean not null default false,
    notify_achievements boolean not null default true,
    notify_alerts boolean not null default true,
    hrmax numeric,
    bpm_alert_min numeric default 50,
    bpm_alert_max numeric default 165,
    spo2_alert_min numeric default 92,
    temp_alert_max numeric default 38,
    fall_detection boolean not null default false,
    fall_sensitivity text default 'medium'
        check (fall_sensitivity in ('low','medium','high')),
    reduced_motion boolean not null default false,
    theme text not null default 'dark'
        check (theme in ('dark','light')),
    consent_health boolean not null default false,
    consent_location boolean not null default false,
    consent_ai boolean not null default false,
    consent_at timestamptz,
    last_report_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 2. SHOE DEVICES
-- ---------------------------------------------------------

create table public.shoe_devices (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    bluetooth_id text,
    hardware text default 'ESP32',
    protocol_version text default '1.0',
    firmware_version text,
    side text default 'pair'
        check (side in ('left','right','pair')),
    battery_pct numeric check (battery_pct between 0 and 100),
    rssi numeric,
    connected boolean not null default false,
    last_seen timestamptz,
    sensors jsonb not null default '[]'::jsonb,
    notes text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    unique(operator_id, bluetooth_id)
);

-- ---------------------------------------------------------
-- 3. ACTIVITIES
-- ---------------------------------------------------------

create table public.activities (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    device_id uuid references public.shoe_devices(id) on delete set null,
    kind text not null default 'walk'
        check (kind in ('walk','run','trail','custom')),
    title text,
    started_at timestamptz not null,
    ended_at timestamptz,
    duration_s numeric check (duration_s >= 0),
    steps numeric check (steps >= 0),
    distance_m numeric check (distance_m >= 0),
    avg_bpm numeric,
    max_bpm numeric,
    avg_spo2 numeric,
    energy_mwh numeric,
    avg_power_mw numeric,
    calories numeric,
    avg_pace_s_km numeric,
    source text not null default 'ble'
        check (source in ('ble','demo','manual')),
    notes text,
    route jsonb not null default '[]'::jsonb,
    samples jsonb not null default '[]'::jsonb,
    pressure_zones jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. MEASUREMENTS
-- ---------------------------------------------------------

create table public.measurements (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    device_id uuid references public.shoe_devices(id) on delete set null,
    activity_id uuid references public.activities(id) on delete set null,
    metric text not null
        check (metric in ('bpm','spo2','temp_c','pressure')),
    value numeric not null,
    unit text,
    quality text not null default 'high'
        check (quality in ('high','medium','low')),
    source text not null default 'ble'
        check (source in ('ble','demo','manual')),
    measured_at timestamptz not null,
    zone text,
    note text,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 5. ENERGY LOGS
-- ---------------------------------------------------------

create table public.energy_logs (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    device_id uuid references public.shoe_devices(id) on delete set null,
    activity_id uuid references public.activities(id) on delete set null,
    power_mw numeric,
    energy_mwh numeric,
    voltage_v numeric,
    current_ma numeric,
    battery_pct numeric check (battery_pct between 0 and 100),
    stored_mwh numeric,
    consumed_mw numeric,
    recorded_at timestamptz not null,
    source text not null default 'ble'
        check (source in ('ble','demo','manual')),
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 6. DEVICE EVENTS
-- ---------------------------------------------------------

create table public.device_events (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    device_id uuid references public.shoe_devices(id) on delete set null,
    kind text not null
        check (kind in ('scan','connect','disconnect','error','notify','command')),
    detail text,
    rssi numeric,
    at timestamptz not null,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 7. HEALTH NOTES
-- ---------------------------------------------------------

create table public.health_notes (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    body text not null,
    note_at timestamptz not null,
    metric text,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 8. SAFETY EVENTS
-- ---------------------------------------------------------

create table public.safety_events (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    kind text not null
        check (kind in ('fall_suspected','sos','test')),
    state text not null default 'detected'
        check (state in ('detected','cancelled','attempted','delivered','failed')),
    occurred_at timestamptz not null,
    latitude numeric,
    longitude numeric,
    contact_name text,
    note text,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 9. EMERGENCY CONTACTS
-- ---------------------------------------------------------

create table public.emergency_contacts (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    phone text not null,
    relation text,
    is_primary boolean not null default false,
    notify_on_fall boolean not null default true,
    created_at timestamptz not null default now()
);

create unique index one_primary_contact_per_user
on public.emergency_contacts(operator_id)
where is_primary = true;

-- ---------------------------------------------------------
-- 10. GOALS
-- ---------------------------------------------------------

create table public.goals (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    metric text not null
        check (metric in ('steps','minutes','energy_mwh','distance_m')),
    period text not null default 'daily'
        check (period in ('daily','weekly','monthly')),
    target numeric not null check (target > 0),
    unit text,
    active boolean not null default true,
    notes text,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 11. ACHIEVEMENTS
-- ---------------------------------------------------------

create table public.achievements (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    key text not null,
    title text not null,
    description text,
    tier text not null default 'bronze'
        check (tier in ('bronze','silver','gold')),
    metric text
        check (metric in ('steps','activities','distance_m','energy_mwh','streak_days')),
    threshold numeric,
    progress numeric not null default 0,
    unlocked_at timestamptz,
    created_at timestamptz not null default now(),
    unique(operator_id, key)
);

-- ---------------------------------------------------------
-- 12. CHALLENGES
-- ---------------------------------------------------------

create table public.challenges (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    title text not null,
    description text,
    metric text not null
        check (metric in ('steps','distance_m','minutes','energy_mwh')),
    target numeric not null check (target > 0),
    unit text,
    starts_on date,
    ends_on date,
    visibility text not null default 'public'
        check (visibility in ('public','followers','private')),
    created_by_name text,
    created_at timestamptz not null default now(),
    check (ends_on is null or starts_on is null or ends_on >= starts_on)
);

-- ---------------------------------------------------------
-- 13. CHALLENGE PARTICIPANTS
-- ---------------------------------------------------------

create table public.challenge_participants (
    id uuid primary key default gen_random_uuid(),
    challenge_id uuid not null references public.challenges(id) on delete cascade,
    operator_id uuid not null references auth.users(id) on delete cascade,
    joined_at timestamptz not null default now(),
    unique(challenge_id, operator_id)
);

-- ---------------------------------------------------------
-- 14. POSTS
-- ---------------------------------------------------------

create table public.posts (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    challenge_id uuid references public.challenges(id) on delete set null,
    author_name text,
    title text,
    body text not null,
    activity_kind text
        check (activity_kind in ('walk','run','trail','custom','achievement','note')),
    distance_m numeric,
    duration_s numeric,
    steps numeric,
    energy_mwh numeric,
    visibility text not null default 'private'
        check (visibility in ('public','followers','private')),
    likes integer not null default 0 check (likes >= 0),
    comments_count integer not null default 0 check (comments_count >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 15. POST LIKES
-- ---------------------------------------------------------

create table public.post_likes (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    operator_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    unique(post_id, operator_id)
);

-- ---------------------------------------------------------
-- 16. COMMENTS
-- ---------------------------------------------------------

create table public.comments (
    id uuid primary key default gen_random_uuid(),
    post_id uuid not null references public.posts(id) on delete cascade,
    operator_id uuid not null references auth.users(id) on delete cascade,
    author_name text,
    body text not null,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 17. REPORTS
-- ---------------------------------------------------------

create table public.reports (
    id uuid primary key default gen_random_uuid(),
    operator_id uuid not null references auth.users(id) on delete cascade,
    post_id uuid not null references public.posts(id) on delete cascade,
    reason text not null,
    detail text,
    created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------

create index idx_devices_operator on public.shoe_devices(operator_id);
create index idx_activities_operator_date on public.activities(operator_id, started_at desc);
create index idx_measurements_operator_date on public.measurements(operator_id, measured_at desc);
create index idx_energy_operator_date on public.energy_logs(operator_id, recorded_at desc);
create index idx_device_events_operator_date on public.device_events(operator_id, at desc);
create index idx_health_notes_operator_date on public.health_notes(operator_id, note_at desc);
create index idx_safety_events_operator_date on public.safety_events(operator_id, occurred_at desc);
create index idx_emergency_contacts_operator on public.emergency_contacts(operator_id);
create index idx_goals_operator on public.goals(operator_id);
create index idx_achievements_operator on public.achievements(operator_id);
create index idx_challenges_visibility on public.challenges(visibility, created_at desc);
create index idx_challenge_participants_user on public.challenge_participants(operator_id);
create index idx_posts_visibility_date on public.posts(visibility, created_at desc);
create index idx_posts_operator_date on public.posts(operator_id, created_at desc);
create index idx_comments_post_date on public.comments(post_id, created_at);
create index idx_reports_post on public.reports(post_id);

-- ---------------------------------------------------------
-- UPDATED_AT TRIGGER
-- ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger vitalstep_profiles_updated_at
before update on public.vitalstep_profiles
for each row execute function public.set_updated_at();

create trigger shoe_devices_updated_at
before update on public.shoe_devices
for each row execute function public.set_updated_at();

create trigger posts_updated_at
before update on public.posts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------

alter table public.vitalstep_profiles enable row level security;
alter table public.shoe_devices enable row level security;
alter table public.activities enable row level security;
alter table public.measurements enable row level security;
alter table public.energy_logs enable row level security;
alter table public.device_events enable row level security;
alter table public.health_notes enable row level security;
alter table public.safety_events enable row level security;
alter table public.emergency_contacts enable row level security;
alter table public.goals enable row level security;
alter table public.achievements enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participants enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- Private user-owned data

create policy "profile_owner_all"
on public.vitalstep_profiles for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "devices_owner_all"
on public.shoe_devices for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "activities_owner_all"
on public.activities for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "measurements_owner_all"
on public.measurements for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "energy_logs_owner_all"
on public.energy_logs for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "device_events_owner_all"
on public.device_events for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "health_notes_owner_all"
on public.health_notes for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "safety_events_owner_all"
on public.safety_events for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "emergency_contacts_owner_all"
on public.emergency_contacts for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "goals_owner_all"
on public.goals for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "achievements_owner_all"
on public.achievements for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

-- Challenges: owner manages; public challenges are readable by authenticated users.

create policy "challenges_read"
on public.challenges for select
using (
    auth.uid() = operator_id
    or visibility = 'public'
);

create policy "challenges_owner_insert"
on public.challenges for insert
with check (auth.uid() = operator_id);

create policy "challenges_owner_update"
on public.challenges for update
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "challenges_owner_delete"
on public.challenges for delete
using (auth.uid() = operator_id);

-- Participants: users can see their own memberships;
-- challenge owners can see memberships for their challenges.

create policy "participants_read"
on public.challenge_participants for select
using (
    auth.uid() = operator_id
    or exists (
        select 1 from public.challenges c
        where c.id = challenge_id and c.operator_id = auth.uid()
    )
);

create policy "participants_join"
on public.challenge_participants for insert
with check (
    auth.uid() = operator_id
    and exists (
        select 1 from public.challenges c
        where c.id = challenge_id
          and (c.visibility = 'public' or c.operator_id = auth.uid())
    )
);

create policy "participants_leave"
on public.challenge_participants for delete
using (auth.uid() = operator_id);

-- Posts: public posts are readable by authenticated users;
-- private/followers posts remain owner-only until follow support exists.

create policy "posts_read"
on public.posts for select
using (auth.uid() = operator_id or visibility = 'public');

create policy "posts_owner_insert"
on public.posts for insert
with check (auth.uid() = operator_id);

create policy "posts_owner_update"
on public.posts for update
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "posts_owner_delete"
on public.posts for delete
using (auth.uid() = operator_id);

-- Likes: visible only when the associated post is visible to the user.

create policy "likes_read"
on public.post_likes for select
using (
    auth.uid() = operator_id
    or exists (
        select 1 from public.posts p
        where p.id = post_id
          and (p.operator_id = auth.uid() or p.visibility = 'public')
    )
);

create policy "likes_insert"
on public.post_likes for insert
with check (
    auth.uid() = operator_id
    and exists (
        select 1 from public.posts p
        where p.id = post_id
          and (p.operator_id = auth.uid() or p.visibility = 'public')
    )
);

create policy "likes_delete"
on public.post_likes for delete
using (auth.uid() = operator_id);

-- Comments: readable on own or public posts; authors manage own comments.

create policy "comments_read"
on public.comments for select
using (
    auth.uid() = operator_id
    or exists (
        select 1 from public.posts p
        where p.id = post_id
          and (p.operator_id = auth.uid() or p.visibility = 'public')
    )
);

create policy "comments_insert"
on public.comments for insert
with check (
    auth.uid() = operator_id
    and exists (
        select 1 from public.posts p
        where p.id = post_id
          and (p.operator_id = auth.uid() or p.visibility = 'public')
    )
);

create policy "comments_owner_update"
on public.comments for update
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

create policy "comments_owner_delete"
on public.comments for delete
using (auth.uid() = operator_id);

-- Reports: users can create and view only their own reports.

create policy "reports_owner_all"
on public.reports for all
using (auth.uid() = operator_id)
with check (auth.uid() = operator_id);

-- ---------------------------------------------------------
-- END OF INITIAL SCHEMA
-- ---------------------------------------------------------
