create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null unique,
  role text not null default 'coach' check (role in ('coach','viewer')),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid references public.profiles(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists organization_invites_organization_id_idx on public.organization_invites(organization_id);
create index if not exists organization_invites_created_by_idx on public.organization_invites(created_by);
create index if not exists organization_invites_accepted_by_idx on public.organization_invites(accepted_by);
alter table public.organization_invites enable row level security;
revoke all on public.organization_invites from anon;
grant select on public.organization_invites to authenticated;
create policy "org admins read invites" on public.organization_invites for select to authenticated using (
  exists (select 1 from public.organization_members m where m.organization_id=organization_invites.organization_id and m.profile_id=(select auth.uid()) and m.role in ('owner','admin'))
);
create or replace function public.create_program_invite(p_organization_id uuid, p_role text default 'coach') returns text
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_code text;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  if p_role not in ('coach','viewer') then raise exception 'Invalid role'; end if;
  if not exists (select 1 from public.organization_members m where m.organization_id=p_organization_id and m.profile_id=v_uid and m.role in ('owner','admin')) then raise exception 'Not authorized'; end if;
  v_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.organization_invites(organization_id,code,role,created_by) values(p_organization_id,v_code,p_role,v_uid);
  return v_code;
end $$;
create or replace function public.accept_program_invite(p_code text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_inv public.organization_invites%rowtype;
begin
  if v_uid is null then raise exception 'Authentication required'; end if;
  select * into v_inv from public.organization_invites where code=upper(trim(p_code)) and accepted_at is null and expires_at>now() for update;
  if not found then raise exception 'Invite is invalid or expired'; end if;
  insert into public.organization_members(organization_id,profile_id,role) values(v_inv.organization_id,v_uid,v_inv.role)
  on conflict (organization_id,profile_id) do update set role=excluded.role;
  update public.organization_invites set accepted_by=v_uid,accepted_at=now() where id=v_inv.id;
  return v_inv.organization_id;
end $$;
revoke all on function public.create_program_invite(uuid,text) from public,anon;
revoke all on function public.accept_program_invite(text) from public,anon;
grant execute on function public.create_program_invite(uuid,text) to authenticated;
grant execute on function public.accept_program_invite(text) to authenticated;
