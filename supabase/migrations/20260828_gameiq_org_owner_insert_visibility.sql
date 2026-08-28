drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select to authenticated
using (owner_profile_id = (select auth.uid()) or private.is_org_member(id));
