export async function listLeaderboardEntriesForLeague(client, leagueId) {
  const { rows } = await client.query(
    `SELECT fantasy_teams.id AS "teamId",
            fantasy_teams.slug AS "teamSlug",
            fantasy_teams.name AS "teamName",
            users.slug AS "managerSlug",
            users.display_name AS "managerName",
            leaderboard_entries.rank,
            COALESCE(leaderboard_entries.points, 0) AS "totalPoints"
     FROM fantasy_teams
     JOIN users ON users.id = fantasy_teams.owner_id
     LEFT JOIN leaderboard_entries
       ON leaderboard_entries.fantasy_team_id = fantasy_teams.id
      AND leaderboard_entries.league_id = fantasy_teams.league_id
     WHERE fantasy_teams.league_id = $1`,
    [leagueId]
  );

  return rows.map((row) => ({
    ...row,
    totalPoints: Number(row.totalPoints),
    rank: row.rank === null ? undefined : row.rank
  }));
}

export async function replaceLeaderboardEntries(client, { leagueId, entries }) {
  for (const entry of entries) {
    await client.query(
      `INSERT INTO leaderboard_entries (league_id, fantasy_team_id, rank, points, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (league_id, fantasy_team_id)
       DO UPDATE SET rank = EXCLUDED.rank,
                     points = EXCLUDED.points,
                     updated_at = now()`,
      [leagueId, entry.teamId, entry.rank, entry.totalPoints]
    );
  }
}
