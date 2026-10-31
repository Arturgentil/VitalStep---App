-- =========================================================
-- VitalStep - MIGRATION 002
-- Ownership integrity and atomic community counters
-- PostgreSQL 15+ / Supabase
-- =========================================================

begin;

-- 1. Composite keys for ownership-aware relationships

alter table public.shoe_devices
    add constraint shoe_devices_id_operator_id_key
    unique (id, operator_id);

alter table public.activities
    add constraint activities_id_operator_id_key
    unique (id, operator_id);

-- 2. Activities must reference their owner's device

alter table public.activities
    drop constraint activities_device_id_fkey;

alter table public.activities
    add constraint activities_device_owner_fkey
    foreign key (device_id, operator_id)
    references public.shoe_devices (id, operator_id)
    on delete set null (device_id);

-- 3. Measurements must reference their owner's device/activity

alter table public.measurements
    drop constraint measurements_device_id_fkey;

alter table public.measurements
    add constraint measurements_device_owner_fkey
    foreign key (device_id, operator_id)
    references public.shoe_devices (id, operator_id)
    on delete set null (device_id);

alter table public.measurements
    drop constraint measurements_activity_id_fkey;

alter table public.measurements
    add constraint measurements_activity_owner_fkey
    foreign key (activity_id, operator_id)
    references public.activities (id, operator_id)
    on delete set null (activity_id);

-- 4. Energy logs must reference their owner's device/activity

alter table public.energy_logs
    drop constraint energy_logs_device_id_fkey;

alter table public.energy_logs
    add constraint energy_logs_device_owner_fkey
    foreign key (device_id, operator_id)
    references public.shoe_devices (id, operator_id)
    on delete set null (device_id);

alter table public.energy_logs
    drop constraint energy_logs_activity_id_fkey;

alter table public.energy_logs
    add constraint energy_logs_activity_owner_fkey
    foreign key (activity_id, operator_id)
    references public.activities (id, operator_id)
    on delete set null (activity_id);

-- 5. Device events must reference their owner's device

alter table public.device_events
    drop constraint device_events_device_id_fkey;

alter table public.device_events
    add constraint device_events_device_owner_fkey
    foreign key (device_id, operator_id)
    references public.shoe_devices (id, operator_id)
    on delete set null (device_id);

-- 6. Reconcile counters before enabling automatic updates

update public.posts p
set
    likes = (
        select count(*)::integer
        from public.post_likes l
        where l.post_id = p.id
    ),
    comments_count = (
        select count(*)::integer
        from public.comments c
        where c.post_id = p.id
    );

-- 7. Atomic counter maintenance
-- Handles insert, delete and moving an interaction to another post.

create or replace function public.refresh_post_counters()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
    old_post_id uuid;
    new_post_id uuid;
begin
    if tg_op <> 'INSERT' then
        old_post_id := old.post_id;
    end if;

    if tg_op <> 'DELETE' then
        new_post_id := new.post_id;
    end if;

    if old_post_id is not null
       and old_post_id is distinct from new_post_id then

        if tg_table_name = 'post_likes' then
            update public.posts
            set likes = greatest(likes - 1, 0)
            where id = old_post_id;
        else
            update public.posts
            set comments_count = greatest(comments_count - 1, 0)
            where id = old_post_id;
        end if;
    end if;

    if new_post_id is not null
       and new_post_id is distinct from old_post_id then

        if tg_table_name = 'post_likes' then
            update public.posts
            set likes = likes + 1
            where id = new_post_id;
        else
            update public.posts
            set comments_count = comments_count + 1
            where id = new_post_id;
        end if;
    end if;

    if tg_op = 'DELETE' then
        return old;
    end if;

    return new;
end;
$$;

revoke all on function public.refresh_post_counters()
from public, anon, authenticated;

create trigger post_likes_refresh_counters
after insert or update or delete on public.post_likes
for each row
execute function public.refresh_post_counters();

create trigger comments_refresh_counters
after insert or update or delete on public.comments
for each row
execute function public.refresh_post_counters();

-- 8. Initialize counters safely on post creation.
-- Clients cannot create posts with fabricated interaction counts.

create or replace function public.initialize_post_counters()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
    new.likes := 0;
    new.comments_count := 0;
    return new;
end;
$$;

revoke all on function public.initialize_post_counters()
from public, anon, authenticated;

create trigger posts_initialize_counters
before insert on public.posts
for each row
execute function public.initialize_post_counters();

-- 9. Prevent authenticated clients from manually changing counters.
-- Other editable post columns remain available.

revoke update on public.posts from authenticated;

grant update (
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
) on public.posts to authenticated;

commit;

-- =========================================================
-- END MIGRATION 002
-- =========================================================
