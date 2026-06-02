# Demo Walkthrough

This app is a reference flow for simulated match events, backend scoring, Postgres state, and Ably LiveSync.

## Routes

| Route | Real-world equivalent | Initial data | LiveSync channels | Messages handled | What to click and what should change |
| --- | --- | --- | --- | --- | --- |
| `/` | Demo launcher | none | none | none | Open the app views in separate tabs and follow the walkthrough cards. |
| `/control-room` | Upstream match feed or event operator | match summary, activity summary | optional debug-only reads | none directly; it sends simulator events to the backend function | Click `Mbappé goal` or another seeded action. The function response should show affected teams and the other views should update after LiveSync delivery. |
| `/league/friends` | Shared fantasy league table | leaderboard, activity | `league:friends:leaderboard`, `league:friends:activity` | `leaderboard.updated`, `activity.created` | Trigger a simulator event. Standings and recent activity should update without refresh. |
| `/client/stephanos` | Individual manager view | team, squad, activity | `league:friends:teams`, `league:friends:activity` | `team.updated`, `activity.created` | Trigger an event that affects Stephanos. The team points, rank, and recent activity should update without refresh. |
| `/tv/friends` | Public display, office TV, or livestream overlay | leaderboard | `league:friends:leaderboard` | `leaderboard.updated` | Trigger any league event. The read-only scoreboard should update without refresh. |
| `/debug` | Developer diagnostics | config, health | debug subscriptions only | connection and message diagnostics | Open the page to verify `/api/config`, `/api/ably/token`, LiveSync status, last message, and expected channels. |

## How To Demo

1. Open `/control-room`.
2. Open `/league/friends`, `/client/stephanos`, and `/tv/friends` in other tabs.
3. Click `Mbappé goal`.
4. Watch the function response, the league table, the client view, and the TV display update after the database commit is delivered through LiveSync.
5. Open `/debug` if you need to confirm the backend function, Neon, or Ably setup.

## Notes

- The frontend loads initial state over HTTP.
- Authoritative scoring and ranking happen in the backend function.
- LiveSync delivers database-confirmed updates from the outbox rows written in the same transaction as the state change.
