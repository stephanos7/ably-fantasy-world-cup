export async function insertActivityFeedItem(
  client,
  { leagueId, userId, message, payload }
) {
  const { rows } = await client.query(
    `INSERT INTO activity_feed (league_id, user_id, message, payload, created_at)
     VALUES ($1, $2, $3, $4::jsonb, now())
     RETURNING id,
               message,
               payload`,
    [leagueId, userId, message, payload]
  );

  return rows[0];
}
