BEGIN;

DROP POLICY IF EXISTS posts_owner_update
ON public.posts;

CREATE POLICY posts_owner_update
ON public.posts
FOR UPDATE
TO public
USING (
    auth.uid() = operator_id
)
WITH CHECK (
    auth.uid() = operator_id
    AND (
        challenge_id IS NULL
        OR EXISTS (
            SELECT 1
            FROM public.challenges AS c
            WHERE c.id = posts.challenge_id
              AND (
                  c.operator_id = auth.uid()
                  OR c.visibility = 'public'
              )
        )
    )
);

COMMIT;
