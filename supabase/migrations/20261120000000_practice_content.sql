-- YogaFlow practice content schema (Issue #8, YF-03; SDD §5.1; ARCHITECTURE §4).
--
-- Applied ONLY by the project owner, after review, by pasting into the Supabase SQL Editor
-- (see docs/SUPABASE_SETUP.md). AI agents never apply this to any Supabase project.
--
-- Public, read-only practice content. No user data, no Supabase Authentication, no Storage.
-- Approved vocabularies are mirrored in lib/content/types.ts; they change only through a
-- documented human decision (Plan §1.4).

-- Helper functions for array CHECK constraints (PostgreSQL does not allow subqueries in CHECK).
-- Pure and immutable; EXECUTE is revoked from the public API roles below.
create or replace function public.practices_text_array_is_distinct(values_in text[])
  returns boolean
  language sql
  immutable
  set search_path = ''
as $$
  select count(*) = count(distinct value) from unnest(values_in) as value
$$;

create or replace function public.practices_text_array_has_no_blanks(values_in text[])
  returns boolean
  language sql
  immutable
  set search_path = ''
as $$
  select not exists (
    select 1 from unnest(values_in) as value where length(btrim(value)) = 0
  )
$$;

revoke execute on function public.practices_text_array_is_distinct(text[])
  from public, anon, authenticated;
revoke execute on function public.practices_text_array_has_no_blanks(text[])
  from public, anon, authenticated;

create table if not exists public.practices (
  -- Stable, unique, URL-safe practice ID. Favorites/Routine store this value in localStorage.
  slug text primary key
    constraint practices_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null
    constraint practices_title_not_blank check (length(btrim(title)) > 0),
  type text not null
    constraint practices_type_allowed check (type in ('Yoga', 'Breathwork', 'Meditation')),
  -- Optional ("when applicable", US-04); required for Yoga (see practices_yoga_classified).
  difficulty text
    constraint practices_difficulty_allowed
      check (difficulty in ('Beginner', 'Intermediate', 'Advanced')),
  -- Empty when body focus does not apply; required for Yoga.
  body_focus text[] not null default '{}'
    constraint practices_body_focus_allowed
      check (
        body_focus <@ array['Full Body', 'Back', 'Hips', 'Legs', 'Shoulders', 'Core']::text[]
        and array_position(body_focus, null) is null
      )
    constraint practices_body_focus_one_dimensional
      check (array_ndims(body_focus) = 1 or cardinality(body_focus) = 0)
    constraint practices_body_focus_unique
      check (public.practices_text_array_is_distinct(body_focus)),
  summary text not null
    constraint practices_summary_not_blank check (length(btrim(summary)) > 0),
  -- Ordered steps.
  instructions text[] not null
    constraint practices_instructions_present
      check (cardinality(instructions) > 0 and array_position(instructions, null) is null)
    constraint practices_instructions_one_dimensional
      check (array_ndims(instructions) = 1 or cardinality(instructions) = 0)
    constraint practices_instructions_no_blank_steps
      check (public.practices_text_array_has_no_blanks(instructions)),
  benefits text not null
    constraint practices_benefits_not_blank check (length(btrim(benefits)) > 0),
  -- Safety & Caution text; null only where no caution is relevant.
  caution text,
  -- Static repository asset under public/ (for example /images/practices/mountain-pose.svg).
  -- Not a URL and not Supabase Storage.
  image_path text not null
    constraint practices_image_path_static
      check (image_path ~ '^/images/practices/[a-z0-9-]+\.(svg|png|jpg|jpeg|webp)$'),
  image_alt text not null
    constraint practices_image_alt_not_blank check (length(btrim(image_alt)) > 0),
  -- Attribution (RC-11). Unreviewed or unlicensed content must stay is_placeholder = true.
  source text,
  license text,
  image_attribution text,
  is_placeholder boolean not null default true,
  created_at timestamptz not null default now(),

  constraint practices_yoga_classified
    check (type <> 'Yoga' or (difficulty is not null and cardinality(body_focus) > 0)),
  constraint practices_attributed_or_placeholder
    check (is_placeholder or (source is not null and license is not null))
);

create index if not exists practices_type_title_idx on public.practices (type, title);

comment on table public.practices is
  'YogaFlow public practice content (Yoga, Breathwork, Meditation). Read-only for the public via RLS.';

-- Row-level security: public read (SELECT) only. There are deliberately NO insert, update, or
-- delete policies, so the anon and authenticated roles cannot write.
alter table public.practices enable row level security;

drop policy if exists "Public can read practices" on public.practices;
create policy "Public can read practices"
  on public.practices
  for select
  to anon, authenticated
  using (true);

-- Grants: remove Supabase's default table privileges and allow SELECT only.
revoke all on table public.practices from anon, authenticated;
grant select on table public.practices to anon, authenticated;
