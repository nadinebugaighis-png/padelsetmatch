
CREATE TABLE public.qa_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  answer TEXT NOT NULL,
  answer_norm TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX qa_answers_profile_idx ON public.qa_answers(profile_id);
CREATE INDEX qa_answers_question_idx ON public.qa_answers(profile_id, question);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_answers TO authenticated;
GRANT ALL ON public.qa_answers TO service_role;

ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own qa_answers"
  ON public.qa_answers FOR ALL
  USING (profile_id = public.my_profile_id())
  WITH CHECK (profile_id = public.my_profile_id());

CREATE POLICY "Users read qa_answers of their matches"
  ON public.qa_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE (m.profile_a = public.my_profile_id() AND m.profile_b = qa_answers.profile_id)
         OR (m.profile_b = public.my_profile_id() AND m.profile_a = qa_answers.profile_id)
    )
  );
