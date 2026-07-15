
CREATE OR REPLACE FUNCTION public.qa_affinity_scores(_me_id uuid, _ids uuid[])
RETURNS TABLE (
  profile_id uuid,
  qa_bonus int,
  q_same int,
  q_close int,
  q_shared int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH mine AS (
    SELECT question, answer_norm, answer_embedding
    FROM public.qa_answers
    WHERE profile_id = _me_id
  ),
  theirs AS (
    SELECT profile_id, question, answer_norm, answer_embedding
    FROM public.qa_answers
    WHERE profile_id = ANY(_ids) AND profile_id <> _me_id
  ),
  paired AS (
    SELECT
      t.profile_id,
      t.question,
      (t.answer_norm = m.answer_norm) AS same_norm,
      CASE
        WHEN m.answer_embedding IS NOT NULL AND t.answer_embedding IS NOT NULL
        THEN 1 - (m.answer_embedding <=> t.answer_embedding)
        ELSE NULL
      END AS sim
    FROM theirs t
    JOIN mine m USING (question)
  )
  SELECT
    p.profile_id,
    LEAST(30, SUM(
      CASE
        WHEN p.same_norm THEN 5
        WHEN p.sim >= 0.85 THEN 4
        WHEN p.sim >= 0.70 THEN 3
        WHEN p.sim >= 0.55 THEN 2
        ELSE 1
      END
    ))::int AS qa_bonus,
    COUNT(*) FILTER (WHERE p.same_norm)::int AS q_same,
    COUNT(*) FILTER (WHERE NOT p.same_norm AND p.sim >= 0.70)::int AS q_close,
    COUNT(*)::int AS q_shared
  FROM paired p
  GROUP BY p.profile_id;
$$;

REVOKE ALL ON FUNCTION public.qa_affinity_scores(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.qa_affinity_scores(uuid, uuid[]) TO authenticated, service_role;
