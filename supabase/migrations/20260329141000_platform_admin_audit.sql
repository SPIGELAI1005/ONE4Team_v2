-- Platform admin audit trail (ST-004 / T-013).

create table if not exists public.platform_admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_admin_audit_created_at
  on public.platform_admin_audit_events (created_at desc);

alter table public.platform_admin_audit_events enable row level security;

-- No direct reads/writes for authenticated; access via security definer RPC only.

create or replace function public.log_platform_admin_action(_action text, _payload jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    return;
  end if;

  insert into public.platform_admin_audit_events (actor_user_id, action, payload)
  values (auth.uid(), _action, coalesce(_payload, '{}'::jsonb));
end;
$$;

revoke all on function public.log_platform_admin_action(text, jsonb) from public;
grant execute on function public.log_platform_admin_action(text, jsonb) to authenticated;
