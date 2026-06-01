export const apiBaseUrl = (import.meta.env.API_BASE_URL || "").replace(
  /\/$/,
  ""
);

async function requestJson(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    ...options
  });
  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof body === "object" && body?.error
        ? body.error
        : response.statusText;
    throw new Error(`API request failed (${response.status}): ${message}`);
  }

  return body;
}

export function getApiConfig() {
  return requestJson("/api/config");
}

export function getHealth() {
  return requestJson("/health");
}

export function getLeaderboard(leagueSlug) {
  return requestJson(
    `/api/leagues/${encodeURIComponent(leagueSlug)}/leaderboard`
  );
}

export function getLeagueActivity(leagueSlug) {
  return requestJson(`/api/leagues/${encodeURIComponent(leagueSlug)}/activity`);
}

export function getClientTeam(userSlug) {
  return requestJson(`/api/clients/${encodeURIComponent(userSlug)}/team`);
}

export function getMatch(matchSlug) {
  return requestJson(`/api/matches/${encodeURIComponent(matchSlug)}`);
}

export function postSimulatorEvent({
  matchSlug,
  eventType,
  playerSlug,
  minute
}) {
  return requestJson("/api/simulator/events", {
    method: "POST",
    body: JSON.stringify({ matchSlug, eventType, playerSlug, minute })
  });
}
