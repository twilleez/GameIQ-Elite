drop policy if exists "profiles: update own row" on public.profiles;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

revoke all on table public.subscriptions from anon;
revoke all on table public.subscriptions from authenticated;
grant select on table public.subscriptions to authenticated;

revoke all on table public.ai_usage from anon;
revoke all on table public.ai_usage from authenticated;
grant select on table public.ai_usage to authenticated;
