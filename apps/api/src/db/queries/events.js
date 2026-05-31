export async function findMatchBySlug(client, matchSlug) {
  const { rows } = await client.query(
    `SELECT matches.id,
            matches.slug,
            matches.league_id AS "leagueId",
            leagues.slug AS "leagueSlug",
            leagues.name AS "leagueName"
     FROM matches
     JOIN leagues ON leagues.id = matches.league_id
     WHERE matches.slug = $1`,
    [matchSlug]
  );

  return rows[0] ?? null;
}

export async function findPlayerBySlug(client, playerSlug) {
  const { rows } = await client.query(
    `SELECT id, slug, name
     FROM players
     WHERE slug = $1`,
    [playerSlug]
  );

  return rows[0] ?? null;
}

export async function insertMatchEvent(
  client,
  { matchId, playerId, eventType, minute }
) {
  const { rows } = await client.query(
    `INSERT INTO match_events (match_id, player_id, event_type, event_time, metadata)
     VALUES ($1, $2, $3, $4, $5::jsonb)
     RETURNING id,
               event_type AS "eventType",
               event_time AS "minute"`,
    [matchId, playerId, eventType, minute, {}]
  );

  return rows[0];
}
