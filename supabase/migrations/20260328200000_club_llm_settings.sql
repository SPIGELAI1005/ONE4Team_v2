-- Per-club LLM provider + API key (admin-managed). Edge functions use service role to read after JWT checks.

create table if not exists public.club_llm_settings (
  club_id uuid primary key references public.clubs(id) on delete cascade,
  provider text not null check (provider in (
    'openai',
    'anthropic',
    'google_gemini',
    'azure_openai',
    'github_models'
  )),
  api_key text not null,
  model text,
  azure_endpoint text,
  azure_api_version text default '2024-02-15-preview',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_club_llm_settings_club_id on public.club_llm_settings(club_id);

alter table public.club_llm_settings enable row level security;

drop policy if exists "club_llm_settings_select_admin" on public.club_llm_settings;
create policy "club_llm_settings_select_admin"
on public.club_llm_settings for select to authenticated
using (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_llm_settings_insert_admin" on public.club_llm_settings;
create policy "club_llm_settings_insert_admin"
on public.club_llm_settings for insert to authenticated
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_llm_settings_update_admin" on public.club_llm_settings;
create policy "club_llm_settings_update_admin"
on public.club_llm_settings for update to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop policy if exists "club_llm_settings_delete_admin" on public.club_llm_settings;
create policy "club_llm_settings_delete_admin"
on public.club_llm_settings for delete to authenticated
using (public.is_club_admin(auth.uid(), club_id));

drop trigger if exists update_club_llm_settings_updated_at on public.club_llm_settings;
create trigger update_club_llm_settings_updated_at
before update on public.club_llm_settings
for each row execute function public.update_updated_at();
