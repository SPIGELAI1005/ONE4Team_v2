-- Review last 20 negative AI message feedback rows (rating = -1).
-- Run in Supabase SQL editor or: psql $DATABASE_URL -f supabase/scripts/ai4t_review_negative_feedback.sql

select
  f.id,
  f.created_at,
  f.club_id,
  f.conversation_id,
  f.message_index,
  f.rating,
  f.comment,
  c.title as conversation_title,
  left(m.content, 200) as message_excerpt
from public.ai_message_feedback f
left join public.ai_conversations c on c.id = f.conversation_id
left join lateral (
  select (elem->>'content') as content
  from jsonb_array_elements(c.messages) with ordinality as t(elem, ord)
  where (ord - 1) = f.message_index
  limit 1
) m on true
where f.rating = -1
order by f.created_at desc
limit 20;
