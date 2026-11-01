BEGIN;

-- Upgrade existing databases without recreating the table or changing its data,
-- grants or RLS policies. Fresh installations already use the new name.
DO $$
DECLARE
    profile_constraint record;
BEGIN
    IF to_regclass('public.stepvolt_profiles') IS NOT NULL THEN
        IF to_regclass('public.vitalstep_profiles') IS NOT NULL THEN
            RAISE EXCEPTION 'Both profile tables exist. Resolve the naming conflict before migrating.';
        END IF;

        ALTER TABLE public.stepvolt_profiles RENAME TO vitalstep_profiles;
    END IF;

    IF EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgrelid = 'public.vitalstep_profiles'::regclass
          AND tgname = 'stepvolt_profiles_updated_at'
    ) THEN
        ALTER TRIGGER stepvolt_profiles_updated_at
        ON public.vitalstep_profiles
        RENAME TO vitalstep_profiles_updated_at;
    END IF;

    -- Constraint names do not change automatically when their table is renamed.
    -- Renaming primary/unique constraints also renames their backing indexes.
    FOR profile_constraint IN
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.vitalstep_profiles'::regclass
          AND starts_with(conname, 'stepvolt_profiles_')
    LOOP
        EXECUTE format(
            'ALTER TABLE public.vitalstep_profiles RENAME CONSTRAINT %I TO %I',
            profile_constraint.conname,
            replace(profile_constraint.conname, 'stepvolt_profiles_', 'vitalstep_profiles_')
        );
    END LOOP;
END;
$$;

COMMIT;
