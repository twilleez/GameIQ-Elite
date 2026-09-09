create index if not exists teams_created_by_idx on public.teams(created_by);
create index if not exists players_created_by_idx on public.players(created_by);
create index if not exists games_created_by_idx on public.games(created_by);
create index if not exists game_events_created_by_idx on public.game_events(created_by);
create index if not exists shots_created_by_idx on public.shots(created_by);
create index if not exists lineup_stints_created_by_idx on public.lineup_stints(created_by);

alter table public.games add constraint games_id_team_id_key unique (id, team_id);
alter table public.players add constraint players_id_team_id_key unique (id, team_id);

alter table public.game_events
  add constraint game_events_game_team_fkey foreign key (game_id, team_id) references public.games(id, team_id) on delete cascade,
  add constraint game_events_player_team_fkey foreign key (player_id, team_id) references public.players(id, team_id) on delete set null;
alter table public.shots
  add constraint shots_game_team_fkey foreign key (game_id, team_id) references public.games(id, team_id) on delete cascade,
  add constraint shots_player_team_fkey foreign key (player_id, team_id) references public.players(id, team_id) on delete set null;
alter table public.lineup_stints
  add constraint lineup_stints_game_team_fkey foreign key (game_id, team_id) references public.games(id, team_id) on delete cascade;

create or replace function public.preserve_created_by()
returns trigger language plpgsql set search_path = '' as $$ begin new.created_by := old.created_by; return new; end; $$;
create trigger teams_preserve_created_by before update on public.teams for each row execute function public.preserve_created_by();
create trigger players_preserve_created_by before update on public.players for each row execute function public.preserve_created_by();
create trigger games_preserve_created_by before update on public.games for each row execute function public.preserve_created_by();
create trigger game_events_preserve_created_by before update on public.game_events for each row execute function public.preserve_created_by();
create trigger shots_preserve_created_by before update on public.shots for each row execute function public.preserve_created_by();
create trigger lineup_stints_preserve_created_by before update on public.lineup_stints for each row execute function public.preserve_created_by();

drop policy if exists game_events_all on public.game_events;
create policy game_events_select on public.game_events for select to authenticated using (exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id)));
create policy game_events_insert on public.game_events for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id)));
create policy game_events_update on public.game_events for update to authenticated using (exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id))) with check (exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id)));
create policy game_events_delete on public.game_events for delete to authenticated using (exists(select 1 from public.teams t where t.id=game_events.team_id and private.is_org_member(t.organization_id)));

drop policy if exists shots_all on public.shots;
create policy shots_select on public.shots for select to authenticated using (exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id)));
create policy shots_insert on public.shots for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id)));
create policy shots_update on public.shots for update to authenticated using (exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id))) with check (exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id)));
create policy shots_delete on public.shots for delete to authenticated using (exists(select 1 from public.teams t where t.id=shots.team_id and private.is_org_member(t.organization_id)));

drop policy if exists lineup_stints_all on public.lineup_stints;
create policy lineup_stints_select on public.lineup_stints for select to authenticated using (exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id)));
create policy lineup_stints_insert on public.lineup_stints for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id)));
create policy lineup_stints_update on public.lineup_stints for update to authenticated using (exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id))) with check (exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id)));
create policy lineup_stints_delete on public.lineup_stints for delete to authenticated using (exists(select 1 from public.teams t where t.id=lineup_stints.team_id and private.is_org_member(t.organization_id)));
