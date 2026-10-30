BEGIN;

DROP POLICY IF EXISTS comments_owner_update
ON public.comments;

CREATE POLICY comments_owner_update
ON public.comments
FOR UPDATE
TO public
USING (
    operator_id = auth.uid()
)
WITH CHECK (
    operator_id = auth.uid()
    AND EXISTS (
        SELECT 1
        FROM public.posts AS p
        WHERE p.id = comments.post_id
          AND (
              p.operator_id = auth.uid()
              OR p.visibility = 'public'
          )
    )
);

COMMIT;
