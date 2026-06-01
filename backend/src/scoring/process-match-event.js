import { calculateTeamDeltas, rankLeaderboard } from "./index.js";
import {
  findMatchBySlug,
  findPlayerBySlug,
  insertMatchEvent
} from "../db/queries/events.js";
import {
  applyFantasyTeamScoreDelta,
  listFantasyTeamsForLeague
} from "../db/queries/fantasy-teams.js";
import {
  listLeaderboardEntriesForLeague,
  replaceLeaderboardEntries
} from "../db/queries/leaderboard.js";
import { insertActivityFeedItem } from "../db/queries/activity-feed.js";
import { insertOutboxEvent } from "../db/queries/outbox.js";

const eventLabels = {
  goal: "goal",
  assist: "assist",
  yellow_card: "yellow card"
};

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function signedPoints(pointsDelta) {
  if (pointsDelta > 0) {
    return `+${pointsDelta}`;
  }

  return String(pointsDelta);
}

function toLeaderboardPayloadEntry(entry) {
  return {
    rank: entry.rank,
    teamSlug: entry.teamSlug,
    teamName: entry.teamName,
    managerSlug: entry.managerSlug,
    managerName: entry.managerName,
    points: entry.totalPoints,
    updatedAt: entry.updatedAt
  };
}

export async function processMatchEvent(
  client,
  { matchSlug, eventType, playerSlug, minute }
) {
  const match = await findMatchBySlug(client, matchSlug);

  if (!match) {
    throw createHttpError(404, `Unknown matchSlug: ${matchSlug}`);
  }

  const player = await findPlayerBySlug(client, playerSlug);

  if (!player) {
    throw createHttpError(404, `Unknown playerSlug: ${playerSlug}`);
  }

  const event = await insertMatchEvent(client, {
    matchId: match.id,
    playerId: player.id,
    eventType,
    minute
  });

  const fantasyTeams = await listFantasyTeamsForLeague(client, match.leagueId);
  const teamDeltas = calculateTeamDeltas({
    event: { playerId: player.id, eventType },
    fantasyTeams
  });
  const teamsById = new Map(fantasyTeams.map((team) => [team.teamId, team]));
  const deltaByTeamId = new Map(
    teamDeltas.map((delta) => [delta.teamId, delta.pointsDelta])
  );

  for (const delta of teamDeltas) {
    await applyFantasyTeamScoreDelta(client, {
      fantasyTeamId: delta.teamId,
      matchId: match.id,
      pointsDelta: delta.pointsDelta
    });
  }

  const currentLeaderboard = await listLeaderboardEntriesForLeague(
    client,
    match.leagueId
  );
  const nextLeaderboardInput = currentLeaderboard.map((entry) => ({
    ...entry,
    previousRank: entry.rank,
    totalPoints: entry.totalPoints + (deltaByTeamId.get(entry.teamId) ?? 0)
  }));
  const rankedLeaderboard = rankLeaderboard({ entries: nextLeaderboardInput });
  const nextLeaderboard = await replaceLeaderboardEntries(client, {
    leagueId: match.leagueId,
    entries: rankedLeaderboard
  });

  const rankedByTeamId = new Map(
    nextLeaderboard.map((entry) => [entry.teamId, entry])
  );
  const activityItems = [];

  for (const delta of teamDeltas) {
    const team = teamsById.get(delta.teamId);
    const message = `${player.name} ${
      eventLabels[eventType]
    }: ${team.teamName} ${signedPoints(delta.pointsDelta)}`;
    const payload = {
      teamSlug: team.teamSlug,
      pointsDelta: delta.pointsDelta,
      matchSlug: match.slug,
      minute
    };

    const activityItem = await insertActivityFeedItem(client, {
      leagueId: match.leagueId,
      userId: team.managerId,
      message,
      payload
    });

    activityItems.push({
      id: activityItem.id,
      teamSlug: team.teamSlug,
      userSlug: team.managerSlug,
      message,
      pointsDelta: delta.pointsDelta,
      matchSlug: match.slug,
      minute
    });
  }

  const mutationId = `simulator:${event.id}`;
  const outboxMessages = [];

  async function addOutboxMessage({ channel, name, data, headers }) {
    const inserted = await insertOutboxEvent(client, {
      mutationId,
      channel,
      name,
      data,
      headers
    });

    const message = {
      sequenceId: inserted.sequenceId,
      channel,
      name
    };

    outboxMessages.push(message);

    if (process.env.NODE_ENV !== "production") {
      console.debug("[Simulator] outbox inserted", {
        mutationId,
        ...message
      });
    }

    return inserted;
  }

  const leaderboardPayload = {
    leagueSlug: match.leagueSlug,
    leaderboard: nextLeaderboard.map(toLeaderboardPayloadEntry)
  };

  await addOutboxMessage({
    channel: `league:${match.leagueSlug}:leaderboard`,
    name: "leaderboard.updated",
    data: leaderboardPayload
  });

  await addOutboxMessage({
    channel: `league:${match.leagueSlug}:activity`,
    name: "activity.created",
    data: {
      leagueSlug: match.leagueSlug,
      items: activityItems
    }
  });

  for (const delta of teamDeltas) {
    const team = teamsById.get(delta.teamId);
    const ranked = rankedByTeamId.get(delta.teamId);

    await addOutboxMessage({
      channel: `league:${match.leagueSlug}:teams`,
      name: "team.updated",
      data: {
        userSlug: team.managerSlug,
        teamSlug: team.teamSlug,
        teamName: team.teamName,
        points: ranked.totalPoints,
        rank: ranked.rank,
        lastEvent: {
          eventType,
          playerSlug: player.slug,
          playerName: player.name,
          pointsDelta: delta.pointsDelta,
          minute
        }
      }
    });
  }

  await addOutboxMessage({
    channel: `match:${match.slug}`,
    name: "match.updated",
    data: {
      matchSlug: match.slug,
      lastEvent: {
        eventType,
        playerSlug: player.slug,
        playerName: player.name,
        minute
      }
    }
  });

  return {
    ok: true,
    event: {
      id: event.id,
      matchSlug: match.slug,
      eventType,
      playerSlug: player.slug,
      minute
    },
    affectedTeams: teamDeltas.map((delta) => {
      const team = teamsById.get(delta.teamId);
      const ranked = rankedByTeamId.get(delta.teamId);

      return {
        teamSlug: team.teamSlug,
        pointsDelta: delta.pointsDelta,
        totalPoints: ranked.totalPoints
      };
    }),
    outboxMessages
  };
}
