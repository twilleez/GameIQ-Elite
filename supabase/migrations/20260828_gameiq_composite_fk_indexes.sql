create index if not exists game_events_game_team_idx on public.game_events(game_id, team_id);
create index if not exists game_events_player_team_idx on public.game_events(player_id, team_id);
create index if not exists shots_game_team_idx on public.shots(game_id, team_id);
create index if not exists shots_player_team_idx on public.shots(player_id, team_id);
create index if not exists lineup_stints_game_team_idx on public.lineup_stints(game_id, team_id);
