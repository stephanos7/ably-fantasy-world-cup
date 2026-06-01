import { Router } from "express";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getDatabase(req) {
  const db = req.app.locals.db;

  if (!db) {
    throw createHttpError(503, "Database is not configured");
  }

  return db;
}

function requireRow(row, message) {
  if (!row) {
    throw createHttpError(404, message);
  }

  return row;
}

function mapActivityItem(row) {
  return {
    id: row.id,
    message: row.message,
    payload: row.payload ?? {},
    createdAt: row.createdAt
  };
}

export function createReadModelsRouter() {
  const router = Router();

  router.get("/leagues/:leagueSlug/leaderboard", async (req, res, next) => {
    try {
      const db = getDatabase(req);
      const { leagueSlug } = req.params;

      const {
        rows: [league]
      } = await db.query(
        `SELECT id,
                slug,
                name
         FROM leagues
         WHERE slug = $1`,
        [leagueSlug]
      );

      requireRow(league, `Unknown leagueSlug: ${leagueSlug}`);

      const { rows: leaderboard } = await db.query(
        `SELECT leaderboard_entries.rank,
                fantasy_teams.slug AS "teamSlug",
                fantasy_teams.name AS "teamName",
                users.slug AS "managerSlug",
                users.display_name AS "managerName",
                leaderboard_entries.points,
                leaderboard_entries.updated_at AS "updatedAt"
         FROM leaderboard_entries
         JOIN fantasy_teams
           ON fantasy_teams.id = leaderboard_entries.fantasy_team_id
         LEFT JOIN users
           ON users.id = fantasy_teams.owner_id
         WHERE leaderboard_entries.league_id = $1
         ORDER BY leaderboard_entries.rank ASC,
                  leaderboard_entries.points DESC,
                  fantasy_teams.name ASC`,
        [league.id]
      );

      res.json({
        league: {
          slug: league.slug,
          name: league.name
        },
        leaderboard: leaderboard.map((entry) => ({
          ...entry,
          points: Number(entry.points)
        }))
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/leagues/:leagueSlug/activity", async (req, res, next) => {
    try {
      const db = getDatabase(req);
      const { leagueSlug } = req.params;

      const {
        rows: [league]
      } = await db.query(
        `SELECT id,
                slug
         FROM leagues
         WHERE slug = $1`,
        [leagueSlug]
      );

      requireRow(league, `Unknown leagueSlug: ${leagueSlug}`);

      const { rows } = await db.query(
        `SELECT id,
                message,
                payload,
                created_at AS "createdAt"
         FROM activity_feed
         WHERE league_id = $1
         ORDER BY created_at DESC,
                  id DESC
         LIMIT 25`,
        [league.id]
      );

      res.json({
        leagueSlug: league.slug,
        items: rows.map(mapActivityItem)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/clients/:userSlug/team", async (req, res, next) => {
    try {
      const db = getDatabase(req);
      const { userSlug } = req.params;

      const {
        rows: [team]
      } = await db.query(
        `SELECT users.id AS "userId",
                users.slug AS "userSlug",
                users.display_name AS "userName",
                fantasy_teams.id AS "teamId",
                fantasy_teams.slug AS "teamSlug",
                fantasy_teams.name AS "teamName",
                leagues.slug AS "leagueSlug",
                leagues.name AS "leagueName",
                leaderboard_entries.rank,
                leaderboard_entries.points,
                leaderboard_entries.updated_at AS "updatedAt"
         FROM users
         JOIN fantasy_teams
           ON fantasy_teams.owner_id = users.id
         JOIN leagues
           ON leagues.id = fantasy_teams.league_id
         LEFT JOIN leaderboard_entries
           ON leaderboard_entries.fantasy_team_id = fantasy_teams.id
          AND leaderboard_entries.league_id = fantasy_teams.league_id
         WHERE users.slug = $1
         ORDER BY fantasy_teams.created_at ASC
         LIMIT 1`,
        [userSlug]
      );

      requireRow(team, `Unknown userSlug: ${userSlug}`);

      const { rows: squad } = await db.query(
        `SELECT players.slug,
                players.name,
                players.position,
                players.nationality,
                fantasy_team_players.is_captain AS "isCaptain"
         FROM fantasy_team_players
         JOIN players
           ON players.id = fantasy_team_players.player_id
         WHERE fantasy_team_players.fantasy_team_id = $1
         ORDER BY fantasy_team_players.is_captain DESC,
                  players.name ASC`,
        [team.teamId]
      );

      const { rows: activity } = await db.query(
        `SELECT id,
                message,
                payload,
                created_at AS "createdAt"
         FROM activity_feed
         WHERE user_id = $1
         ORDER BY created_at DESC,
                  id DESC
         LIMIT 10`,
        [team.userId]
      );

      res.json({
        user: {
          slug: team.userSlug,
          name: team.userName
        },
        league: {
          slug: team.leagueSlug,
          name: team.leagueName
        },
        team: {
          slug: team.teamSlug,
          name: team.teamName,
          points: Number(team.points ?? 0),
          rank: team.rank ?? null,
          updatedAt: team.updatedAt
        },
        squad,
        activity: activity.map(mapActivityItem)
      });
    } catch (error) {
      next(error);
    }
  });

  router.get("/matches/:matchSlug", async (req, res, next) => {
    try {
      const db = getDatabase(req);
      const { matchSlug } = req.params;

      const {
        rows: [match]
      } = await db.query(
        `SELECT matches.id,
                matches.slug,
                matches.home_team AS "homeTeam",
                matches.away_team AS "awayTeam",
                matches.match_date AS "matchDate",
                matches.status,
                leagues.slug AS "leagueSlug",
                leagues.name AS "leagueName"
         FROM matches
         JOIN leagues
           ON leagues.id = matches.league_id
         WHERE matches.slug = $1`,
        [matchSlug]
      );

      requireRow(match, `Unknown matchSlug: ${matchSlug}`);

      const { rows: events } = await db.query(
        `SELECT match_events.id,
                match_events.event_type AS "eventType",
                match_events.event_time AS "minute",
                match_events.created_at AS "createdAt",
                players.slug AS "playerSlug",
                players.name AS "playerName"
         FROM match_events
         LEFT JOIN players
           ON players.id = match_events.player_id
         WHERE match_events.match_id = $1
         ORDER BY match_events.created_at DESC,
                  match_events.id DESC
         LIMIT 25`,
        [match.id]
      );

      res.json({
        match: {
          slug: match.slug,
          homeTeam: match.homeTeam,
          awayTeam: match.awayTeam,
          matchDate: match.matchDate,
          status: match.status,
          leagueSlug: match.leagueSlug,
          leagueName: match.leagueName
        },
        events
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
