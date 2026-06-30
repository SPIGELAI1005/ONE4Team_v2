-- Richer membership packages: components, categories, display order.

alter table public.membership_fee_types
  add column if not exists price_components jsonb not null default '[]'::jsonb;

alter table public.membership_fee_types
  add column if not exists member_category text;

alter table public.membership_fee_types
  add column if not exists fee_kind text;

alter table public.membership_fee_types
  add column if not exists sort_order integer not null default 0;

comment on column public.membership_fee_types.price_components is
  'Optional line items [{ "label": "...", "amount": 168.00 }]. When non-empty, amount should equal their sum.';

comment on column public.membership_fee_types.member_category is
  'youth | adult | senior | shared | none — shared levies apply to all member types in annual summary.';

comment on column public.membership_fee_types.fee_kind is
  'membership | levy | joining | other';

notify pgrst, 'reload schema';
