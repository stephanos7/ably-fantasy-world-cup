export async function listFantasyTeamsForLeague(client, leagueId) {
  const { rows } = await client.query(
    `SELECT fantasy_teams.id AS "teamId",
            fantasy_teams.slug AS "teamSlug",
            fantasy_teams.name AS "teamName",
            users.id AS "managerId",
            users.slug AS "managerSlug",
            users.display_name AS "managerName",
            players.id AS "playerId",
            fantasy_team_players.is_captain AS "isCaptain"
     FROM fantasy_teams
     JOIN users ON users.id = fantasy_teams.owner_id
     LEFT JOIN fantasy_team_players
       ON fantasy_team_players.fantasy_team_id = fantasy_teams.id
     LEFT JOIN players ON players.id = fantasy_team_players.player_id
     WHERE fantasy_teams.league_id = $1
     ORDER BY fantasy_teams.name, players.slug`,
    [leagueId]
  );

  const teamsById = new Map();

  for (const row of rows) {
    if (!teamsById.has(row.teamId)) {
      teamsById.set(row.teamId, {
        teamId: row.teamId,
        teamSlug: row.teamSlug,
        teamName: row.teamName,
        managerId: row.managerId,
        managerSlug: row.managerSlug,
        managerName: row.managerName,
        players: []
      });
    }

    if (row.playerId) {
      teamsById.get(row.teamId).players.push({
        playerId: row.playerId,
        isCaptain: row.isCaptain
      });
    }
  }

  return [...teamsById.values()];
}

export async function applyFantasyTeamScoreDelta(
  client,
  { fantasyTeamId, matchId, pointsDelta }
) {
  const { rows } = await client.query(
    `INSERT INTO fantasy_team_scores (fantasy_team_id, match_id, score)
     VALUES ($1, $2, $3)
     ON CONFLICT (fantasy_team_id, match_id)
     DO UPDATE SET score = fantasy_team_scores.score + EXCLUDED.score
     RETURNING score`,
    [fantasyTeamId, matchId, pointsDelta]
  );

  return rows[0].score;
}
