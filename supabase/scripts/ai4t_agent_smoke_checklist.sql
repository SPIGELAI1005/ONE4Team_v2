-- AI 4 T agent smoke checklist (plan week, cancel training, notify trainers).
-- After each manual run, confirm rows in ai_agent_runs and execution_result links.

-- Recent agent runs (last 7 days)
select
  id,
  created_at,
  intent,
  status,
  user_id,
  conversation_id,
  execution_result->'links' as outcome_links,
  error_message
from public.ai_agent_runs
where created_at >= now() - interval '7 days'
order by created_at desc
limit 30;

-- Count by intent + status this week
select intent, status, count(*)::int as n
from public.ai_agent_runs
where created_at >= date_trunc('week', now())
group by 1, 2
order by 1, 2;

-- Golden question manual harness (log failures as ai4t-pilot GitHub issues):
-- GQ-01 next match / roster | GQ-05 cancel training clarify | GQ-06 plan week propose
-- Run signed in as Allach trainer; record conversation_id + run id per path.
