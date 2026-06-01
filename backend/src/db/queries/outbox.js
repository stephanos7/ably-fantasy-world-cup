export async function insertOutboxEvent(
  client,
  { mutationId, channel, name, data, headers = {} }
) {
  const { rows } = await client.query(
    `INSERT INTO outbox (
       mutation_id,
       channel,
       name,
       rejected,
       data,
       headers
     )
     VALUES ($1, $2, $3, false, $4::jsonb, $5::jsonb)
     RETURNING sequence_id AS "sequenceId"`,
    [mutationId, channel, name, data, headers]
  );

  return rows[0];
}
