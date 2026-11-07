ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_question_slot text;

CREATE OR REPLACE FUNCTION public.save_my_qa_answer_slot(_question text, _category text, _answer text, _slot text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF _slot IS NOT NULL AND _slot !~ '^\d{4}-\d{2}-\d{2}-(am|pm)$' THEN
    RAISE EXCEPTION 'Invalid slot';
  END IF;
  v_id := public.save_my_qa_answer(_question, _category, _answer,
    CASE WHEN _slot IS NULL THEN NULL ELSE left(_slot, 10)::date END);
  IF _slot IS NOT NULL THEN
    UPDATE public.profiles SET daily_question_slot = _slot WHERE user_id = auth.uid();
  END IF;
  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.save_my_qa_answer_slot(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_my_qa_answer_slot(text, text, text, text) TO authenticated;