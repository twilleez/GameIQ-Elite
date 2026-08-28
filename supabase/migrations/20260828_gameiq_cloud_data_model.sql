create schema if not exists private;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(), owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120), client_ref text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_profile_id, client_ref)
);
create table if not exists public.organization_members (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'coach' check (role in ('owner','coach','viewer')), created_at timestamptz not null default now(),
  primary key (organization_id, profile_id)
);
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid not null references public.profiles(id), name text not null check (char_length(name) between 1 and 120),
  season_name text, client_ref text, archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(organization_id, client_ref)
);
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id), client_ref text, jersey_number text,
  display_name text not null check (char_length(display_name) between 1 and 120), position text, active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id, client_ref)
);
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(), team_id uuid not null references public.teams(id) on delete cascade,
  created_by uuid not null references public.profiles(id), client_ref text, opponent_name text not null default 'Opponent', venue text,
  game_date date, started_at timestamptz, ended_at timestamptz, status text not null default 'draft' check (status in ('draft','live','final','archived')),
  current_period text not null default '1', period_seconds integer not null default 600 check (period_seconds between 60 and 3600),
  team_score integer not null default 0 check (team_score >= 0), opponent_score integer not null default 0 check (opponent_score >= 0),
  local_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(team_id, client_ref)
);
create table if not exists public.game_events (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade, player_id uuid references public.players(id) on delete set null,
  created_by uuid not null references public.profiles(id), client_ref text not null, event_type text not null, period text not null,
  clock_seconds integer check (clock_seconds is null or clock_seconds >= 0), value integer, payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(), local_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(game_id, client_ref)
);
create table if not exists public.shots (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade, player_id uuid references public.players(id) on delete set null,
  created_by uuid not null references public.profiles(id), client_ref text not null, made boolean not null, points integer not null check (points in (2,3)),
  x numeric(7,3), y numeric(7,3), period text not null, clock_seconds integer check (clock_seconds is null or clock_seconds >= 0),
  local_updated_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(game_id, client_ref)
);
create table if not exists public.lineup_stints (
  id uuid primary key default gen_random_uuid(), game_id uuid not null references public.games(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade, created_by uuid not null references public.profiles(id), client_ref text not null,
  player_ids uuid[] not null default '{}'::uuid[], period text not null, start_clock_seconds integer, end_clock_seconds integer,
  points_for integer not null default 0, points_against integer not null default 0, local_updated_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(game_id, client_ref)
);

create index if not exists organization_members_profile_id_idx on public.organization_members(profile_id);
create index if not exists teams_organization_id_idx on public.teams(organization_id);
create index if not exists players_team_id_idx on public.players(team_id);
create index if not exists games_team_id_idx on public.games(team_id);
create index if not exists games_updated_at_idx on public.games(updated_at);
create index if not exists game_events_game_id_idx on public.game_events(game_id);
create index if not exists game_events_team_id_idx on public.game_events(team_id);
create index if not exists game_events_player_id_idx on public.game_events(player_id);
create index if not exists game_events_updated_at_idx on public.game_events(updated_at);
create index if not exists shots_game_id_idx on public.shots(game_id);
create index if not exists shots_team_id_idx on public.shots(team_id);
create index if not exists shots_player_id_idx on public.shots(player_id);
create index if not exists shots_updated_at_idx on public.shots(updated_at);
create index if not exists lineup_stints_game_id_idx on public.lineup_stints(game_id);
create index if not exists lineup_stints_team_id_idx on public.lineup_stints(team_id);

create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
create or replace function private.is_org_member(org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations o where o.id=org_id and o.owner_profile_id=(select auth.uid()))
      or exists (select 1 from public.organization_members m where m.organization_id=org_id and m.profile_id=(select auth.uid()));
$$;
create or replace function private.is_org_owner(org_id uuid) returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.organizations o where o.id=org_id and o.owner_profile_id=(select auth.uid()));
$$;
revoke all on function private.is_org_member(uuid) from public, anon;
revoke all on function private.is_org_owner(uuid) from public, anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.is_org_owner(uuid) to authenticated;

alter table public.organizations enable row level security; alter table public.organization_members enable row level security;
alter table public.teams enable row level security; alter table public.players enable row level security; alter table public.games enable row level security;
alter table public.game_events enable row level security; alter table public.shots enable row level security; alter table public.lineup_stints enable row level security;

create policy organizations_select on public.organizations for select to authenticated using (private.is_org_member(id));
create policy organizations_insert on public.organizations for insert to authenticated with check (owner_profile_id=(select auth.uid()));
create policy organizations_update on public.organizations for update to authenticated using (private.is_org_owner(id)) with check (owner_profile_id=(select auth.uid()));
create policy organizations_delete on public.organizations for delete to authenticated using (private.is_org_owner(id));
create policy organization_members_select on public.organization_members for select to authenticated using (profile_id=(select auth.uid()) or private.is_org_owner(organization_id));
create policy organization_members_insert on public.organization_members for insert to authenticated with check (private.is_org_owner(organization_id));
create policy organization_members_update on public.organization_members for update to authenticated using (private.is_org_owner(organization_id)) with check (private.is_org_owner(organization_id));
create policy organization_members_delete on public.organization_members for delete to authenticated using (private.is_org_owner(organization_id));
create policy teams_all on public.teams for all to authenticated using (private.is_org_member(organization_id)) with check (private.is_org_member(organization_id) and created_by=(select auth.uid()));
create policy players_select on public.players for select to authenticated using (exists(select 1 from public.teams t where t.id=players.team_id and private.is_org_member(t.organization_id)));
create policy players_insert on public.players for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=players.team_id and private.is_org_member(t.organization_id)));
create policy players_update on public.players for update to authenticated using (exists(select 1 from public.teams t where t.id=players.team_id and private.is_org_member(t.organization_id))) with check (exists(select 1 from public.teams t where t.id=players.team_id and private.is_org_member(t.organization_id)));
create policy players_delete on public.players for delete to authenticated using (exists(select 1 from public.teams t where t.id=players.team_id and private.is_org_member(t.organization_id)));
create policy games_select on public.games for select to authenticated using (exists(select 1 from public.teams t where t.id=games.team_id and private.is_org_member(t.organization_id)));
create policy games_insert on public.games for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=games.team_id and private.is_org_member(t.organization_id)));
create policy games_update on public.games for update to authenticated using (exists(select 1 from public.teams t where t.id=games.team_id and private.is_org_member(t.organization_id))) with check (exists(select 1 from public.teams t where t.id=games.team_id and private.is_org_member(t.organization_id)));
create policy games_delete on public.games for delete to authenticated using (exists(select 1 from public.teams t where t.id=games.team_id and private.is_org_member(t.organization_id)));
create policy game_events_all on public.game_events for all to authenticated using (exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id))) with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id)));
create policy shots_all on public.shots for all to authenticated using (exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id))) with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id)));
create policy lineup_stints_all on public.lineup_stints for all to authenticated using (exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id))) with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id)));

grant select,insert,update,delete on public.organizations,public.organization_members,public.teams,public.players,public.games,public.game_events,public.shots,public.lineup_stints to authenticated;
revoke all on public.organizations,public.organization_members,public.teams,public.players,public.games,public.game_events,public.shots,public.lineup_stints from anon;

create trigger organizations_set_updated_at before update on public.organizations for each row execute function public.set_updated_at();
create trigger teams_set_updated_at before update on public.teams for each row execute function public.set_updated_at();
create trigger players_set_updated_at before update on public.players for each row execute function public.set_updated_at();
create trigger games_set_updated_at before update on public.games for each row execute function public.set_updated_at();
create trigger game_events_set_updated_at before update on public.game_events for each row execute function public.set_updated_at();
create trigger shots_set_updated_at before update on public.shots for each row execute function public.set_updated_at();
create trigger lineup_stints_set_updated_at before update on public.lineup_stints for each row execute function public.set_updated_at();
