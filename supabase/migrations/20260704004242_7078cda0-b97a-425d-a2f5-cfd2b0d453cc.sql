
create extension if not exists vector;

alter table public.qa_answers
  add column if not exists answer_embedding vector(1536);

create index if not exists qa_answers_embedding_idx
  on public.qa_answers using hnsw (answer_embedding vector_cosine_ops);

create table if not exists public.compatibility_scores (
  profile_a uuid not null references public.profiles(id) on delete cascade,
  profile_b uuid not null references public.profiles(id) on delete cascade,
  score int not null check (score between 0 and 100),
  blurb text not null,
  model_version text not null default 'v1',
  created_at timestamptz not null default now(),
  primary key (profile_a, profile_b),
  check (profile_a < profile_b)
);

grant select on public.compatibility_scores to authenticated;
grant all on public.compatibility_scores to service_role;
alter table public.compatibility_scores enable row level security;

create policy "read compatibility involving me"
on public.compatibility_scores for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id in (profile_a, profile_b) and p.user_id = auth.uid()
  )
);
