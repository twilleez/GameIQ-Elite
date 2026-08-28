drop policy if exists teams_all on public.teams;
create policy teams_select on public.teams for select to authenticated using (private.is_org_member(organization_id));
create policy teams_insert on public.teams for insert to authenticated with check (private.is_org_member(organization_id) and created_by=(select auth.uid()));
create policy teams_update on public.teams for update to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id));
create policy teams_delete on public.teams for delete to authenticated using (private.is_org_member(organization_id));
