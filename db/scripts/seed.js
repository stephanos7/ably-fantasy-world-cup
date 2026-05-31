import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const requireFromApi = createRequire(
  path.resolve(__dirname, "..", "..", "apps", "api", "package.json")
);
const dotenv = requireFromApi("dotenv");
const { Pool } = requireFromApi("pg");

dotenv.config({ path: path.resolve(__dirname, "..", "..", ".env") });

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgres://postgres:postgres@localhost:5432/ably_fantasy_world_cup";

function createPool() {
  return new Pool({ connectionString: databaseUrl });
}

export async function runSeed() {
  const pool = createPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const seeds = {
      users: [
        {
          slug: "stephanos",
          display_name: "Stephanos",
          email: "stephanos@example.com"
        },
        { slug: "maria", display_name: "Maria", email: "maria@example.com" },
        {
          slug: "andreas",
          display_name: "Andreas",
          email: "andreas@example.com"
        },
        { slug: "theo", display_name: "Theo", email: "theo@example.com" }
      ],
      players: [
        {
          slug: "mbappe",
          name: "Mbappé",
          position: "Forward",
          nationality: "France"
        },
        {
          slug: "kane",
          name: "Kane",
          position: "Forward",
          nationality: "England"
        },
        {
          slug: "bellingham",
          name: "Bellingham",
          position: "Midfielder",
          nationality: "England"
        },
        {
          slug: "saka",
          name: "Saka",
          position: "Winger",
          nationality: "England"
        },
        {
          slug: "rodri",
          name: "Rodri",
          position: "Midfielder",
          nationality: "Spain"
        }
      ]
    };

    for (const user of seeds.users) {
      await client.query(
        `INSERT INTO users (slug, display_name, email, created_at, updated_at)
         VALUES ($1, $2, $3, now(), now())
         ON CONFLICT (slug)
         DO UPDATE SET display_name = EXCLUDED.display_name,
                       email = EXCLUDED.email,
                       updated_at = now()`,
        [user.slug, user.display_name, user.email]
      );
    }

    for (const player of seeds.players) {
      await client.query(
        `INSERT INTO players (slug, name, position, nationality, created_at, updated_at)
         VALUES ($1, $2, $3, $4, now(), now())
         ON CONFLICT (slug)
         DO UPDATE SET name = EXCLUDED.name,
                       position = EXCLUDED.position,
                       nationality = EXCLUDED.nationality,
                       updated_at = now()`,
        [player.slug, player.name, player.position, player.nationality]
      );
    }

    await client.query(
      `INSERT INTO leagues (slug, name, description, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, (SELECT id FROM users WHERE slug = $4), now(), now())
       ON CONFLICT (slug)
       DO UPDATE SET name = EXCLUDED.name,
                     description = EXCLUDED.description,
                     created_by = (SELECT id FROM users WHERE slug = $4),
                     updated_at = now()`,
      ["friends", "Friends League", "A demo league for the team.", "stephanos"]
    );

    const { rows: userRows } = await client.query(
      `SELECT id, slug FROM users WHERE slug = ANY($1)`,
      [["stephanos", "maria", "andreas", "theo"]]
    );
    const usersBySlug = Object.fromEntries(
      userRows.map((row) => [row.slug, row.id])
    );

    const { rows: playerRows } = await client.query(
      `SELECT id, slug FROM players WHERE slug = ANY($1)`,
      [["mbappe", "kane", "bellingham", "saka", "rodri"]]
    );
    const playersBySlug = Object.fromEntries(
      playerRows.map((row) => [row.slug, row.id])
    );

    const {
      rows: [leagueRow]
    } = await client.query(`SELECT id FROM leagues WHERE slug = $1`, [
      "friends"
    ]);
    if (!leagueRow?.id) {
      throw new Error("Friends league not found after seeding users.");
    }
    const leagueId = leagueRow.id;

    await client.query(
      `INSERT INTO matches (slug, league_id, home_team, away_team, match_date, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, now(), now())
       ON CONFLICT (slug)
       DO UPDATE SET league_id = EXCLUDED.league_id,
                     home_team = EXCLUDED.home_team,
                     away_team = EXCLUDED.away_team,
                     match_date = EXCLUDED.match_date,
                     status = EXCLUDED.status,
                     updated_at = now()`,
      [
        "france-england",
        leagueId,
        "France",
        "England",
        "2026-06-14",
        "scheduled"
      ]
    );

    for (const slug of ["stephanos", "maria", "andreas", "theo"]) {
      const userId = usersBySlug[slug];
      await client.query(
        `INSERT INTO league_members (league_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (league_id, user_id)
         DO UPDATE SET role = EXCLUDED.role`,
        [leagueId, userId, "member"]
      );
    }

    const fantasyTeams = [
      {
        slug: "stephanos-heroes",
        name: "Stephanos' Heroes",
        ownerSlug: "stephanos"
      },
      {
        slug: "maria-mavericks",
        name: "Maria's Mavericks",
        ownerSlug: "maria"
      },
      {
        slug: "andreas-attackers",
        name: "Andreas' Attackers",
        ownerSlug: "andreas"
      },
      { slug: "theo-tacticians", name: "Theo's Tacticians", ownerSlug: "theo" }
    ];

    for (const team of fantasyTeams) {
      await client.query(
        `INSERT INTO fantasy_teams (slug, name, league_id, owner_id, created_at, updated_at)
         VALUES ($1, $2, $3, (SELECT id FROM users WHERE slug = $4), now(), now())
         ON CONFLICT (slug)
         DO UPDATE SET name = EXCLUDED.name,
                       league_id = EXCLUDED.league_id,
                       owner_id = (SELECT id FROM users WHERE slug = $4),
                       updated_at = now()`,
        [team.slug, team.name, leagueId, team.ownerSlug]
      );
    }

    const { rows: teamRows } = await client.query(
      `SELECT id, slug FROM fantasy_teams WHERE slug = ANY($1)`,
      [
        [
          "stephanos-heroes",
          "maria-mavericks",
          "andreas-attackers",
          "theo-tacticians"
        ]
      ]
    );
    const teamsBySlug = Object.fromEntries(
      teamRows.map((row) => [row.slug, row.id])
    );

    const squadAssignments = [
      {
        teamSlug: "stephanos-heroes",
        players: [
          { slug: "mbappe", isCaptain: true },
          { slug: "kane", isCaptain: false },
          { slug: "bellingham", isCaptain: false }
        ]
      },
      {
        teamSlug: "maria-mavericks",
        players: [
          { slug: "saka", isCaptain: false },
          { slug: "rodri", isCaptain: true },
          { slug: "bellingham", isCaptain: false }
        ]
      },
      {
        teamSlug: "andreas-attackers",
        players: [
          { slug: "kane", isCaptain: false },
          { slug: "rodri", isCaptain: false },
          { slug: "mbappe", isCaptain: false }
        ]
      },
      {
        teamSlug: "theo-tacticians",
        players: [
          { slug: "saka", isCaptain: false },
          { slug: "mbappe", isCaptain: false },
          { slug: "kane", isCaptain: true }
        ]
      }
    ];

    for (const assignment of squadAssignments) {
      const teamId = teamsBySlug[assignment.teamSlug];
      for (const player of assignment.players) {
        const playerId = playersBySlug[player.slug];
        await client.query(
          `INSERT INTO fantasy_team_players (fantasy_team_id, player_id, is_captain, joined_at)
           VALUES ($1, $2, $3, now())
           ON CONFLICT (fantasy_team_id, player_id)
           DO UPDATE SET is_captain = EXCLUDED.is_captain`,
          [teamId, playerId, player.isCaptain]
        );
      }
    }

    const leaderboardEntries = [
      { teamSlug: "stephanos-heroes", rank: 1, points: 52 },
      { teamSlug: "maria-mavericks", rank: 2, points: 47 },
      { teamSlug: "andreas-attackers", rank: 3, points: 41 },
      { teamSlug: "theo-tacticians", rank: 4, points: 36 }
    ];

    for (const entry of leaderboardEntries) {
      const teamId = teamsBySlug[entry.teamSlug];
      await client.query(
        `INSERT INTO leaderboard_entries (league_id, fantasy_team_id, rank, points, updated_at)
         VALUES ($1, $2, $3, $4, now())
         ON CONFLICT (league_id, fantasy_team_id)
         DO UPDATE SET rank = EXCLUDED.rank,
                       points = EXCLUDED.points,
                       updated_at = now()`,
        [leagueId, teamId, entry.rank, entry.points]
      );
    }

    await client.query(
      `INSERT INTO activity_feed (league_id, user_id, message, payload, created_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (league_id, user_id, message) DO NOTHING`,
      [
        leagueId,
        usersBySlug.stephanos,
        "Welcome to the Friends League!",
        { tag: "seed" }
      ]
    );

    await client.query("COMMIT");
    console.log("Seed complete.");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] === __filename) {
  runSeed()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
