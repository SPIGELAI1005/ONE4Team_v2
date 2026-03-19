-- Club property layer model: training/admin maps + typed elements.

create table if not exists public.club_property_layers (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references public.clubs(id) on delete cascade,
  name text not null,
  purpose text not null default 'training' check (purpose in ('training', 'administration', 'operations', 'other')),
  description text,
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (club_id, name)
);

alter table public.club_pitches
  add column if not exists layer_id uuid references public.club_property_layers(id) on delete set null,
  add column if not exists element_type text not null default 'pitch'
    check (element_type in ('pitch', 'clubhouse', 'street', 'garage', 'stadium', 'parking', 'storage', 'other'));

create index if not exists idx_club_pitches_layer_id on public.club_pitches(layer_id);

alter table public.club_property_layers enable row level security;

drop policy if exists club_property_layers_select_member on public.club_property_layers;
create policy club_property_layers_select_member
on public.club_property_layers
for select
to authenticated
using (public.is_member_of_club(auth.uid(), club_id));

drop policy if exists club_property_layers_manage_admin on public.club_property_layers;
create policy club_property_layers_manage_admin
on public.club_property_layers
for all
to authenticated
using (public.is_club_admin(auth.uid(), club_id))
with check (public.is_club_admin(auth.uid(), club_id));

drop trigger if exists update_club_property_layers_updated_at on public.club_property_layers;
create trigger update_club_property_layers_updated_at
before update on public.club_property_layers
for each row execute function public.update_updated_at();
