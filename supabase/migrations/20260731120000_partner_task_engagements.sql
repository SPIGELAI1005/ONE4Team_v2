-- Partner engagements: link tasks to events and categorize club/partner work

alter table public.partner_tasks
  add column if not exists engagement_category text not null default 'other'
    check (engagement_category in (
      'sporting_event',
      'club_event',
      'maintenance',
      'facility',
      'supply_delivery',
      'sponsorship',
      'service',
      'other'
    ));

alter table public.partner_tasks
  add column if not exists related_event_id uuid references public.events(id) on delete set null;

alter table public.partner_tasks
  add column if not exists location text;

create index if not exists partner_tasks_club_engagement_idx
  on public.partner_tasks (club_id, engagement_category, task_status, due_date);

create index if not exists partner_tasks_related_event_idx
  on public.partner_tasks (related_event_id)
  where related_event_id is not null;
