-- Backfill profile rows for auth users created before the on_auth_user_created trigger existed.
-- Mirrors public.handle_new_user(): id + email only; tier falls back to the column default.
-- Safe to run more than once: it only inserts users that have no profile yet.
-- REQUIRES WILLIE'S APPROVAL before running against production (vkefnajzxgdtovfjdctt).

insert into public.profiles (id, email)
select u.id, u.email
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- Verify: should return 0
select count(*) as users_without_profile
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
