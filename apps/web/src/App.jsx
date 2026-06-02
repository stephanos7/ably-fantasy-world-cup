import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  CssBaseline,
  Divider,
  FormControlLabel,
  Grid,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme
} from "@mui/material";
import {
  Link as RouterLink,
  NavLink,
  Outlet,
  Route,
  Routes,
  useParams
} from "react-router-dom";
import { APP_NAME } from "@ably-fantasy-world-cup/shared";
import {
  apiBaseUrl,
  getApiConfig,
  getClientTeam,
  getHealth,
  getLeaderboard,
  getLeagueActivity,
  getMatch,
  postSimulatorEvent
} from "./api/client.js";
import { createLiveSyncClient } from "./api/livesync.js";

const demoLeagueSlug = "friends";
const demoUserSlug = "stephanos";
const demoMatchSlug = "france-england";

const navItems = [
  { label: "Launcher", to: "/" },
  { label: "Control Room", to: "/control-room" },
  { label: "Client", to: `/client/${demoUserSlug}` },
  { label: "League", to: `/league/${demoLeagueSlug}` },
  { label: "TV", to: `/tv/${demoLeagueSlug}` },
  { label: "Debug", to: "/debug" }
];

const launcherCards = [
  {
    title: "Control Room",
    route: "/control-room",
    description:
      "Start here. Trigger simulated match events and inspect the backend function response."
  },
  {
    title: "Client View",
    route: `/client/${demoUserSlug}`,
    description:
      "Keep this open beside the Control Room to watch one manager's team update through LiveSync."
  },
  {
    title: "League Table",
    route: `/league/${demoLeagueSlug}`,
    description:
      "Watch the shared Friends League leaderboard update from database-confirmed state."
  },
  {
    title: "TV Mode",
    route: `/tv/${demoLeagueSlug}`,
    description:
      "Open a read-only public scoreboard for the shared league table."
  },
  {
    title: "Debug",
    route: "/debug",
    description: "Check Netlify Functions, Neon, and LiveSync configuration."
  }
];

const simulatorActions = [
  {
    label: "Mbappé goal",
    payload: {
      matchSlug: demoMatchSlug,
      eventType: "goal",
      playerSlug: "mbappe",
      minute: 72
    }
  },
  {
    label: "Kane goal",
    payload: {
      matchSlug: demoMatchSlug,
      eventType: "goal",
      playerSlug: "kane",
      minute: 73
    }
  },
  {
    label: "Bellingham assist",
    payload: {
      matchSlug: demoMatchSlug,
      eventType: "assist",
      playerSlug: "bellingham",
      minute: 75
    }
  },
  {
    label: "Saka yellow card",
    payload: {
      matchSlug: demoMatchSlug,
      eventType: "yellow_card",
      playerSlug: "saka",
      minute: 80
    }
  }
];

function createAppTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === "light" ? "#007a5a" : "#32d6a0"
      },
      secondary: {
        main: mode === "light" ? "#2855a7" : "#8fb4ff"
      },
      warning: {
        main: "#d17a00"
      },
      background: {
        default: mode === "light" ? "#f5f7f8" : "#111418",
        paper: mode === "light" ? "#ffffff" : "#1a2027"
      }
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily: ["Inter", "Roboto", "Helvetica", "Arial", "sans-serif"].join(
        ","
      ),
      h1: {
        fontSize: "2.5rem",
        fontWeight: 700
      },
      h2: {
        fontSize: "1.75rem",
        fontWeight: 700
      },
      h3: {
        fontSize: "1.25rem",
        fontWeight: 700
      },
      button: {
        textTransform: "none",
        fontWeight: 700
      }
    },
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8
          }
        }
      }
    }
  });
}

export function App() {
  const [mode, setMode] = useState(
    () => window.localStorage.getItem("themeMode") || "light"
  );
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  function handleModeChange(event) {
    const nextMode = event.target.checked ? "dark" : "light";
    setMode(nextMode);
    window.localStorage.setItem("themeMode", nextMode);
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route
          element={<RouteLayout mode={mode} onModeChange={handleModeChange} />}
        >
          <Route index element={<DemoLauncherPage />} />
          <Route path="control-room" element={<ControlRoomPage />} />
          <Route path="client/:userSlug" element={<ClientPage />} />
          <Route path="league/:leagueSlug" element={<LeaguePage />} />
          <Route path="tv/:leagueSlug" element={<TvPage />} />
          <Route path="debug" element={<DebugPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </ThemeProvider>
  );
}

function RouteLayout({ mode, onModeChange }) {
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppHeader mode={mode} onModeChange={onModeChange} />
      <Container component="main" maxWidth="lg" sx={{ py: { xs: 3, md: 4 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}

function AppHeader({ mode, onModeChange }) {
  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        "@media (max-width:279.95px)": {
          display: "none"
        },
        borderBottom: 1,
        borderColor: "divider",
        bgcolor: "background.paper"
      }}
    >
      <Toolbar sx={{ gap: 2, alignItems: "center", flexWrap: "wrap", py: 1 }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h6"
          sx={{
            color: "text.primary",
            fontWeight: 800,
            mr: { xs: 0, md: 2 },
            textDecoration: "none"
          }}
        >
          {APP_NAME}
        </Typography>

        <Stack
          component="nav"
          direction="row"
          spacing={0.5}
          sx={{
            flex: 1,
            minWidth: { xs: "100%", md: 0 },
            overflowX: "auto",
            order: { xs: 3, md: 2 },
            pb: { xs: 0.5, md: 0 }
          }}
        >
          {navItems.map((item) => (
            <Button
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.to === "/"}
              size="small"
              sx={{
                color: "text.secondary",
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                "&.active": {
                  color: "primary.main",
                  bgcolor: "action.selected"
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        <FormControlLabel
          control={<Switch checked={mode === "dark"} onChange={onModeChange} />}
          label={mode === "dark" ? "Dark" : "Light"}
          sx={{ ml: "auto", order: { xs: 2, md: 3 } }}
        />
      </Toolbar>
    </AppBar>
  );
}

function DemoLauncherPage() {
  return (
    <Stack spacing={4}>
      <PageHeading
        title="Choose your view"
        description="Use this page to open the demo views in separate tabs, then trigger a match event from the Control Room and watch the database-confirmed updates arrive through LiveSync."
      />

      <LiveSyncFlowExplanation />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={2}>
            <Typography component="h2" variant="h3">
              How to demo this
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 4 }}>
                <InstructionStep
                  step="1"
                  title="Open the Control Room"
                  description="This is the simulated upstream sports feed or internal event operator."
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InstructionStep
                  step="2"
                  title="Open live views"
                  description="Open League, Client, and TV in other tabs so you can see the synced views update."
                />
              </Grid>
              <Grid size={{ xs: 12, md: 4 }}>
                <InstructionStep
                  step="3"
                  title="Trigger Mbappé goal"
                  description="Watch the backend write Postgres state and LiveSync outbox rows in one transaction, then see the confirmed updates arrive."
                />
              </Grid>
            </Grid>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        {launcherCards.map((card) => (
          <Grid
            key={card.route}
            size={{ xs: 12, md: card.title === "Debug" ? 12 : 6 }}
          >
            <CardAction
              title={card.title}
              route={card.route}
              description={card.description}
            />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

function LiveSyncFlowExplanation() {
  return (
    <Card variant="outlined">
      <CardContent>
        <Stack spacing={2}>
          <Typography component="h2" variant="h3">
            How Ably LiveSync works
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 3 }}>
              <InstructionStep
                step="1"
                title="Simulator input"
                description="The Control Room sends a seeded match event to a Netlify Function."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <InstructionStep
                step="2"
                title="Backend truth"
                description="The backend function scores affected teams and ranks the leaderboard."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <InstructionStep
                step="3"
                title="Postgres commit"
                description="App tables and LiveSync outbox rows are written together inside one transaction."
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <InstructionStep
                step="4"
                title="Synced views"
                description="Ably LiveSync publishes confirmed updates to browser tabs."
              />
            </Grid>
          </Grid>
        </Stack>
      </CardContent>
    </Card>
  );
}

function InstructionStep({ step, title, description }) {
  return (
    <Stack spacing={1} sx={{ height: "100%" }}>
      <Chip
        label={step}
        color="primary"
        size="small"
        sx={{ alignSelf: "flex-start", fontWeight: 800 }}
      />
      <Typography component="h3" variant="h3">
        {title}
      </Typography>
      <Typography color="text.secondary">{description}</Typography>
    </Stack>
  );
}

function CardAction({ title, route, description }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography component="h2" variant="h3">
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
          <Box>
            <Button
              component={RouterLink}
              to={route}
              target="_blank"
              rel="noopener noreferrer"
              variant="contained"
            >
              Open view
            </Button>
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function ControlRoomPage() {
  const [latestResponse, setLatestResponse] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const matchState = useAsyncData(() => getMatch(demoMatchSlug), []);
  const activityState = useAsyncData(
    () => getLeagueActivity(demoLeagueSlug),
    []
  );

  useEffect(() => {
    function scrollToAnchor() {
      const targetId = window.location.hash.slice(1);

      if (!targetId) {
        return;
      }

      document.getElementById(targetId)?.scrollIntoView({
        block: "start"
      });
    }

    scrollToAnchor();
    window.addEventListener("hashchange", scrollToAnchor);

    return () => {
      window.removeEventListener("hashchange", scrollToAnchor);
    };
  }, []);

  async function handleSimulatorAction(action) {
    setPendingAction(action.label);
    setSubmitError(null);

    try {
      const response = await postSimulatorEvent(action.payload);
      setLatestResponse(response);
      await Promise.all([matchState.refresh(), activityState.refresh()]);
    } catch (error) {
      setSubmitError(error.message);
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Stack spacing={3}>
      <PageHeading
        eyebrow="Control room"
        title="France vs England"
        description="Simulate world cup events. Real, world cup events can be added by using the Sportsmonks API. Click on an event and watch the League Table, User views and Activity feed update in real time on another window/tab/device."
      />

      {submitError ? <Alert severity="error">{submitError}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card
            variant="outlined"
            id="simulate-world-cup-event"
            sx={{ scrollMarginTop: 96 }}
          >
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  Simulate a World Cup event
                </Typography>
                <Typography
                  color="text.secondary"
                  sx={{ "@media (max-width:298.95px)": { display: "none" } }}
                >
                  Simulate events to test the app.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  flexWrap="wrap"
                >
                  {simulatorActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="contained"
                      onClick={() => handleSimulatorAction(action)}
                      disabled={Boolean(pendingAction)}
                    >
                      {pendingAction === action.label
                        ? "Sending..."
                        : action.label}
                    </Button>
                  ))}
                </Stack>
                <Divider />
                <Stack spacing={1}>
                  <Typography component="h3" variant="h3">
                    Watch the result
                  </Typography>
                  <Typography color="text.secondary">
                    Open the live views below in separate tabs before clicking
                    an event.
                  </Typography>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    flexWrap="wrap"
                  >
                    <Button
                      component={RouterLink}
                      to={`/client/${demoUserSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                    >
                      Open client tab
                    </Button>
                    <Button
                      component={RouterLink}
                      to={`/league/${demoLeagueSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                    >
                      Open league tab
                    </Button>
                    <Button
                      component={RouterLink}
                      to={`/tv/${demoLeagueSlug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="outlined"
                    >
                      Open TV tab
                    </Button>
                  </Stack>
                </Stack>
                <Divider />
                <AsyncBlock
                  state={matchState}
                  emptyMessage="No match summary available."
                >
                  {(data) => (
                    <MatchSummary match={data.match} events={data.events} />
                  )}
                </AsyncBlock>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Stack spacing={2}>
            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography component="h2" variant="h3">
                    Function response
                  </Typography>
                  <Typography color="text.secondary">
                    This is the immediate HTTP response from the Netlify
                    Function. LiveSync delivery is visible in the Client,
                    League, TV, and Debug views.
                  </Typography>
                  {latestResponse ? (
                    <Stack spacing={2}>
                      <AffectedTeams teams={latestResponse.affectedTeams} />
                      <CodeBlock value={latestResponse} />
                    </Stack>
                  ) : null}
                </Stack>
              </CardContent>
            </Card>

            <Card
              variant="outlined"
              id="activity-feed"
              sx={{ scrollMarginTop: 96 }}
            >
              <CardContent>
                <Stack spacing={2}>
                  <Typography component="h2" variant="h3">
                    Recent activity
                  </Typography>
                  <AsyncBlock
                    state={activityState}
                    emptyMessage="No activity yet."
                  >
                    {(data) => <ActivityFeed items={data.items} />}
                  </AsyncBlock>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

function LeaguePage() {
  const { leagueSlug } = useParams();
  const leaderboardState = useAsyncData(
    () => getLeaderboard(leagueSlug),
    [leagueSlug]
  );
  const activityState = useAsyncData(
    () => getLeagueActivity(leagueSlug),
    [leagueSlug]
  );
  const { updateData: updateLeaderboardData } = leaderboardState;
  const { updateData: updateActivityData } = activityState;
  const liveSyncChannels = useMemo(
    () => [`league:${leagueSlug}:leaderboard`, `league:${leagueSlug}:activity`],
    [leagueSlug]
  );
  const handleLiveSyncMessage = useCallback(
    ({ name, data }) => {
      const payload = unwrapLiveSyncPayload(data);

      if (name === "leaderboard.updated") {
        const entries = normalizeLeaderboardEntries(
          payload?.leaderboard ?? payload?.entries
        );

        if (payload?.leagueSlug && payload.leagueSlug !== leagueSlug) {
          return `ignored leaderboard for league ${payload.leagueSlug}`;
        }

        updateLeaderboardData((current) => {
          return {
            ...current,
            leaderboard: entries
          };
        });

        return `leaderboard replaced with ${entries.length} rows`;
      }

      if (name === "activity.created") {
        const items = normalizeActivityItems(payload);

        if (payload?.leagueSlug && payload.leagueSlug !== leagueSlug) {
          return `ignored activity for league ${payload.leagueSlug}`;
        }

        updateActivityData((current) => {
          return {
            ...current,
            items: mergeActivityItems(current.items, items)
          };
        });

        return `activity merged with ${items.length} incoming item${items.length === 1 ? "" : "s"}`;
      }

      return `ignored event ${name}`;
    },
    [leagueSlug, updateActivityData, updateLeaderboardData]
  );
  const liveSync = useLiveSyncSubscriptions({
    channels: liveSyncChannels,
    onMessage: handleLiveSyncMessage
  });

  return (
    <Stack spacing={3}>
      <PageHeading
        title="Leaderboard"
        description="Realtime fantasy leaderboard every participant can watch. Updates via Ably LiveSync."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <AsyncBlock
                  state={leaderboardState}
                  emptyMessage="No leaderboard entries yet."
                >
                  {(data) => (
                    <>
                      <Typography component="h2" variant="h3">
                        {data.league.name}
                      </Typography>
                      <LeaderboardTable entries={data.leaderboard} />
                    </>
                  )}
                </AsyncBlock>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={2}>
            <LiveSyncStatus
              status={liveSync.status}
              channels={liveSyncChannels}
              debug={liveSync.debug}
            />

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography component="h2" variant="h3">
                    Recent activity
                  </Typography>
                  <AsyncBlock
                    state={activityState}
                    emptyMessage="No activity yet."
                  >
                    {(data) => <ActivityFeed items={data.items} />}
                  </AsyncBlock>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
    </Stack>
  );
}

function ClientPage() {
  const { userSlug } = useParams();
  const clientState = useAsyncData(() => getClientTeam(userSlug), [userSlug]);
  const { updateData: updateClientData } = clientState;
  const clientLeagueSlug = clientState.data?.league?.slug;
  const teamSubscriptionLabel = clientLeagueSlug
    ? `league:${clientLeagueSlug}:teams`
    : "league:{leagueSlug}:teams";
  const activitySubscriptionLabel = clientLeagueSlug
    ? `league:${clientLeagueSlug}:activity`
    : "league:{leagueSlug}:activity";
  const liveSyncChannels = useMemo(
    () => [
      ...(clientLeagueSlug
        ? [
            `league:${clientLeagueSlug}:teams`,
            `league:${clientLeagueSlug}:activity`
          ]
        : [])
    ],
    [clientLeagueSlug]
  );
  const handleLiveSyncMessage = useCallback(
    ({ name, data }) => {
      const payload = unwrapLiveSyncPayload(data);

      if (name === "team.updated") {
        if (payload?.userSlug && payload.userSlug !== userSlug) {
          return `ignored team update for ${payload.userSlug}`;
        }

        console.debug("[ClientPage] team.updated received", {
          userSlug,
          rawData: data,
          payload
        });

        updateClientData((current) => {
          console.debug("[ClientPage] applying team.updated", {
            userSlug,
            currentPoints: current?.team?.points,
            nextPoints: payload?.points ?? payload?.totalPoints,
            currentRank: current?.team?.rank,
            nextRank: payload?.rank
          });
          return {
            ...current,
            team: {
              ...current.team,
              slug: payload?.teamSlug ?? current.team.slug,
              name: payload?.teamName ?? current.team.name,
              points: Number(
                payload?.points ?? payload?.totalPoints ?? current.team.points
              ),
              rank: payload?.rank ?? current.team.rank,
              previousRank: payload?.previousRank ?? current.team.previousRank,
              rankDelta: payload?.rankDelta ?? current.team.rankDelta,
              lastEvent: payload?.lastEvent ?? current.team.lastEvent,
              updatedAt: payload?.updatedAt ?? current.team.updatedAt
            },
            squad: payload?.squad ?? current.squad
          };
        });

        return `team ${payload?.teamSlug ?? userSlug} updated`;
      }

      if (name === "activity.created") {
        let mergedCount = 0;

        console.debug("[ClientPage] activity.created received", {
          userSlug,
          rawData: data,
          payload
        });
        updateClientData((current) => {
          const incomingItems = normalizeActivityItems(payload).filter(
            (item) => {
              const itemTeamSlug = item.teamSlug ?? item.payload?.teamSlug;
              return itemTeamSlug === current.team.slug;
            }
          );

          mergedCount = incomingItems.length;

          if (incomingItems.length === 0) {
            return current;
          }

          return {
            ...current,
            activity: mergeActivityItems(current.activity, incomingItems, 10)
          };
        });

        return mergedCount > 0
          ? `activity merged with ${mergedCount} matching item${mergedCount === 1 ? "" : "s"}`
          : "ignored activity with no matching team item";
      }

      return `ignored event ${name}`;
    },
    [updateClientData, userSlug]
  );
  const liveSync = useLiveSyncSubscriptions({
    channels: liveSyncChannels,
    onMessage: handleLiveSyncMessage
  });

  return (
    <Stack spacing={3}>
      <PageHeading
        title="Your team"
        description="A user's personal team view. Updates arrive through Ably LiveSync connected to a central postgres db"
      />
      <LiveSyncStatus
        status={liveSync.status}
        channels={liveSyncChannels}
        debug={liveSync.debug}
      />

      <Card variant="outlined">
        <CardContent>
          <Stack spacing={1.5}>
            <Typography component="h2" variant="h3">
              How this view syncs
            </Typography>
            <Typography color="text.secondary">
              This page subscribes to the league teams and activity channels for
              the current league. It applies only `team.updated` messages whose
              payload `userSlug` matches this route, so the manager sees only
              their own confirmed team updates.
            </Typography>
            <Box component="details">
              <Box
                component="summary"
                sx={{ cursor: "pointer", fontWeight: 700 }}
              >
                Developer note
              </Box>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                After the team data loads, the page subscribes to{" "}
                <code>{teamSubscriptionLabel}</code> and{" "}
                <code>{activitySubscriptionLabel}</code>. Activity items are
                filtered so only entries for the current team are merged into
                the UI.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <AsyncBlock
        state={clientState}
        emptyMessage="No team found for this user."
      >
        {(data) => (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography component="h2" variant="h3">
                      {data.team.name}
                    </Typography>
                    <Typography color="text.secondary">
                      {data.user.name}
                    </Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <StatChip label="Points" value={data.team.points} />
                      <StatChip
                        label="Rank"
                        value={formatRank(data.team.rank)}
                      />
                    </Stack>
                    {data.team.lastEvent ? (
                      <Typography variant="body2" color="text.secondary">
                        Last event: {formatTeamLastEvent(data.team.lastEvent)}
                      </Typography>
                    ) : null}
                    <Typography variant="body2" color="text.secondary">
                      {data.league.name}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 7 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography component="h2" variant="h3">
                      Squad
                    </Typography>
                    <SquadTable squad={data.squad} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography component="h2" variant="h3">
                      Recent activity
                    </Typography>
                    <ActivityFeed items={data.activity} />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </AsyncBlock>
    </Stack>
  );
}

function TvPage() {
  const { leagueSlug } = useParams();
  const leaderboardState = useAsyncData(
    () => getLeaderboard(leagueSlug),
    [leagueSlug]
  );
  const { updateData: updateLeaderboardData } = leaderboardState;
  const liveSyncChannels = useMemo(
    () => [`league:${leagueSlug}:leaderboard`],
    [leagueSlug]
  );
  const handleLiveSyncMessage = useCallback(
    ({ name, data }) => {
      const payload = unwrapLiveSyncPayload(data);

      if (name !== "leaderboard.updated") {
        return `ignored event ${name}`;
      }

      const entries = normalizeLeaderboardEntries(
        payload?.leaderboard ?? payload?.entries
      );

      if (payload?.leagueSlug && payload.leagueSlug !== leagueSlug) {
        return `ignored leaderboard for league ${payload.leagueSlug}`;
      }

      updateLeaderboardData((current) => {
        return {
          ...current,
          leaderboard: entries
        };
      });

      return `leaderboard replaced with ${entries.length} rows`;
    },
    [leagueSlug, updateLeaderboardData]
  );
  const liveSync = useLiveSyncSubscriptions({
    channels: liveSyncChannels,
    onMessage: handleLiveSyncMessage
  });

  return (
    <Stack spacing={3} sx={{ py: { md: 4 } }}>
      <PageHeading title="Public scoreboard" />

      <AsyncBlock
        state={leaderboardState}
        emptyMessage="No leaderboard entries yet."
      >
        {(data) => (
          <Stack spacing={3}>
            <LiveSyncStatus
              status={liveSync.status}
              channels={liveSyncChannels}
              debug={liveSync.debug}
              compact
            />
            <Stack spacing={0.5}>
              <Typography
                component="h1"
                sx={{
                  fontSize: { xs: "2.75rem", md: "4rem" },
                  fontWeight: 800
                }}
              >
                {data.league.name}
              </Typography>
            </Stack>
            <Paper
              variant="outlined"
              id="tv-leaderboard"
              sx={{ overflow: "hidden", scrollMarginTop: 96 }}
            >
              <Table size="medium">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 96 }}>Rank</TableCell>
                    <TableCell>Team</TableCell>
                    <TableCell align="right">Points</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.leaderboard.map((entry) => (
                    <TableRow key={entry.teamSlug}>
                      <TableCell>
                        <Typography sx={{ fontSize: "2rem", fontWeight: 800 }}>
                          {entry.rank}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            fontSize: { xs: "1.5rem", md: "2.25rem" },
                            fontWeight: 800
                          }}
                        >
                          {entry.teamName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography
                          sx={{
                            fontSize: { xs: "1.75rem", md: "2.75rem" },
                            fontWeight: 800
                          }}
                        >
                          {entry.points}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        )}
      </AsyncBlock>
    </Stack>
  );
}

function DebugPage() {
  const healthState = useAsyncData(getHealth, []);
  const configState = useAsyncData(getApiConfig, []);
  const liveSyncDebug = useLiveSyncDebugSnapshot();

  return (
    <Stack spacing={3}>
      <PageHeading
        title="Runtime diagnostics"
        description="Use this page to verify the Netlify Function, Neon database, and Ably LiveSync setup."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  Netlify Functions
                </Typography>
                <KeyValue
                  label="Function base URL"
                  value={apiBaseUrl || "same origin"}
                />
                <AsyncBlock
                  state={healthState}
                  emptyMessage="Health status unavailable."
                >
                  {(data) => <CodeBlock value={data} />}
                </AsyncBlock>
                <Typography color="text.secondary" variant="body2">
                  Confirm `GET /api/config` works and reports both database and
                  Ably as configured.
                </Typography>
                <AsyncBlock
                  state={configState}
                  emptyMessage="Config unavailable."
                >
                  {(data) => <CodeBlock value={data} />}
                </AsyncBlock>
                <Typography color="text.secondary" variant="body2">
                  Confirm `GET /api/ably/token` works by opening a live view and
                  checking that the browser receives an Ably token request.
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  What to check
                </Typography>
                <List dense disablePadding>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="/api/config works"
                      secondary="The response should show databaseConfigured=true and ablyConfigured=true."
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="/api/ably/token works"
                      secondary="Open a live view and confirm the browser can request an Ably token."
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="LiveSync connected"
                      secondary={
                        liveSyncDebug?.status ??
                        "No connection state observed yet."
                      }
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="Last received channel and message"
                      secondary={
                        liveSyncDebug?.lastMessage
                          ? `${liveSyncDebug.lastMessage.channel} / ${liveSyncDebug.lastMessage.name}`
                          : "No LiveSync message has been received in this tab yet."
                      }
                    />
                  </ListItem>
                  <ListItem disableGutters>
                    <ListItemText
                      primary="Expected subscribed channels"
                      secondary={
                        liveSyncDebug?.subscribedChannels?.length
                          ? `Expected demo channels include league:friends:leaderboard, league:friends:activity, league:friends:teams, and match:france-england. Current tab subscriptions: ${liveSyncDebug.subscribedChannels.join(", ")}`
                          : "Expected demo channels include league:friends:leaderboard, league:friends:activity, league:friends:teams, and match:france-england."
                      }
                    />
                  </ListItem>
                </List>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  LiveSync debug
                </Typography>
                <Typography color="text.secondary">
                  Check the last received message, the subscribed channels, and
                  the current connection state after opening one of the live
                  views.
                </Typography>
                {liveSyncDebug ? (
                  <CodeBlock value={liveSyncDebug} />
                ) : (
                  <EmptyState message="No LiveSync messages have been observed in this tab." />
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Stack>
  );
}

function MatchSummary({ match, events }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} flexWrap="wrap">
        <Chip
          label={`${match.homeTeam} vs ${match.awayTeam}`}
          color="primary"
        />
        <Chip label={match.status} variant="outlined" />
        <Chip label={match.leagueName} variant="outlined" />
      </Stack>
      <Typography component="h3" variant="h3">
        Match events
      </Typography>
      <ActivityFeed
        items={events.map((event) => ({
          id: event.id,
          message: `${event.minute}' ${event.playerName} ${formatEventType(event.eventType)}`,
          createdAt: event.createdAt
        }))}
      />
    </Stack>
  );
}

function LeaderboardTable({ entries }) {
  if (entries.length === 0) {
    return <EmptyState message="No leaderboard entries yet." />;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Rank</TableCell>
            <TableCell>Team</TableCell>
            <TableCell>Manager</TableCell>
            <TableCell align="right">Points</TableCell>
            <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
              Updated
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.teamSlug}>
              <TableCell>{entry.rank}</TableCell>
              <TableCell>{entry.teamName}</TableCell>
              <TableCell>
                {entry.managerName || entry.managerSlug || "Unassigned"}
              </TableCell>
              <TableCell align="right">{entry.points}</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                {formatDateTime(entry.updatedAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function SquadTable({ squad }) {
  if (squad.length === 0) {
    return <EmptyState message="No squad players yet." />;
  }

  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Player</TableCell>
            <TableCell>Position</TableCell>
            <TableCell>Nation</TableCell>
            <TableCell>Captain</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {squad.map((player) => (
            <TableRow key={player.slug}>
              <TableCell>{player.name}</TableCell>
              <TableCell>{player.position || "-"}</TableCell>
              <TableCell>{player.nationality || "-"}</TableCell>
              <TableCell>
                {player.isCaptain ? (
                  <Chip label="Captain" size="small" color="primary" />
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ActivityFeed({ items }) {
  if (!items || items.length === 0) {
    return <EmptyState message="No activity yet." />;
  }

  return (
    <List dense disablePadding>
      {items.map((item, index) => (
        <ListItem key={getActivityItemKey(item, index)} disableGutters divider>
          <ListItemText
            primary={item.message}
            secondary={formatDateTime(item.createdAt)}
          />
        </ListItem>
      ))}
    </List>
  );
}

function AffectedTeams({ teams }) {
  if (!teams || teams.length === 0) {
    return <EmptyState message="No fantasy teams were affected." />;
  }

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap">
      {teams.map((team) => (
        <Chip
          key={team.teamSlug}
          label={`${team.teamSlug}: ${formatSigned(team.pointsDelta)} (${team.totalPoints})`}
          color={team.pointsDelta >= 0 ? "primary" : "warning"}
          variant="outlined"
        />
      ))}
    </Stack>
  );
}

function StatChip({ label, value }) {
  return (
    <Chip label={`${label}: ${value}`} color="primary" variant="outlined" />
  );
}

function KeyValue({ label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Typography color="text.secondary">{label}</Typography>
      <Chip label={value} variant="outlined" />
    </Stack>
  );
}

function LiveSyncStatus({ status, channels, debug, compact = false }) {
  const label = liveSyncStatusLabel(status);
  const color = liveSyncStatusColor(status);
  const description =
    status === "auth_failed"
      ? "LiveSync is not configured. Add ABLY_API_KEY and configure the Ably-hosted Postgres connector against the same database."
      : `${label} for ${channels.length} channel${channels.length === 1 ? "" : "s"}.`;
  const lastMessage = debug?.lastMessage;

  if (compact) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip label={label} color={color} variant="outlined" />
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
        {lastMessage ? (
          <Typography variant="body2" color="text.secondary">
            Last: {lastMessage.channel} / {lastMessage.name}
          </Typography>
        ) : null}
      </Stack>
    );
  }

  return (
    <Alert
      severity={
        status === "connected"
          ? "success"
          : status === "auth_failed"
            ? "error"
            : "info"
      }
      icon={false}
    >
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Chip label={label} color={color} size="small" />
          <Typography variant="body2">{description}</Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {channels.map((channel) => (
            <Chip
              key={channel}
              label={channel}
              size="small"
              variant="outlined"
            />
          ))}
        </Stack>
        {lastMessage || debug?.lastMerge || debug?.lastError ? (
          <Typography variant="body2" color="text.secondary">
            {lastMessage
              ? `Last message ${lastMessage.channel} / ${lastMessage.name} at ${formatTime(lastMessage.receivedAt)}. `
              : ""}
            {debug?.lastMerge ? `Merge: ${debug.lastMerge}. ` : ""}
            {debug?.lastError ? `Error: ${debug.lastError}.` : ""}
          </Typography>
        ) : null}
      </Stack>
    </Alert>
  );
}

function AsyncBlock({ state, emptyMessage, children }) {
  if (state.loading) {
    return (
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CircularProgress size={20} />
        <Typography color="text.secondary">Loading...</Typography>
      </Stack>
    );
  }

  if (state.error) {
    return <Alert severity="error">{state.error}</Alert>;
  }

  if (!state.data) {
    return <EmptyState message={emptyMessage} />;
  }

  return children(state.data);
}

function EmptyState({ message }) {
  return (
    <Typography color="text.secondary" sx={{ py: 1 }}>
      {message}
    </Typography>
  );
}

function CodeBlock({ value }) {
  return (
    <Box
      component="pre"
      sx={{
        bgcolor: "action.hover",
        borderRadius: 1,
        fontSize: "0.8125rem",
        m: 0,
        maxHeight: 300,
        overflow: "auto",
        p: 2,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word"
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
}

function PageHeading({ eyebrow, title, description }) {
  return (
    <Stack spacing={1}>
      <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>
        {eyebrow}
      </Typography>
      <Typography component="h1" variant="h1">
        {title}
      </Typography>
      <Typography
        color="text.secondary"
        sx={{
          maxWidth: 760,
          "@media (max-width:298.95px)": { display: "none" }
        }}
      >
        {description}
      </Typography>
    </Stack>
  );
}

function NotFoundPage() {
  return (
    <Stack spacing={2}>
      <PageHeading
        eyebrow="Not found"
        title="Route unavailable"
        description="This frontend includes the demo routes for the Ably LiveSync reference app."
      />
      <Box>
        <Button component={RouterLink} to="/" variant="contained">
          Return to launcher
        </Button>
      </Box>
    </Stack>
  );
}

function useAsyncData(load, deps) {
  const [state, setState] = useState({
    data: null,
    error: null,
    loading: true
  });

  const refresh = useCallback(async () => {
    setState((current) => ({ ...current, error: null, loading: true }));

    try {
      const data = await load();
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      setState({ data: null, error: error.message, loading: false });
      return null;
    }
  }, deps);

  useEffect(() => {
    let active = true;

    setState((current) => ({ ...current, error: null, loading: true }));
    load()
      .then((data) => {
        if (active) {
          setState({ data, error: null, loading: false });
        }
      })
      .catch((error) => {
        if (active) {
          setState({ data: null, error: error.message, loading: false });
        }
      });

    return () => {
      active = false;
    };
  }, deps);

  const updateData = useCallback((updater) => {
    setState((current) => {
      if (!current.data) {
        return current;
      }

      return {
        ...current,
        data: updater(current.data)
      };
    });
  }, []);

  return { ...state, refresh, updateData };
}

function logLiveSync(message, details) {
  if (import.meta.env.DEV) {
    console.info(`[LiveSync] ${message}`, details ?? "");
  }
}

function publishLiveSyncDebug(debug) {
  if (typeof window === "undefined") {
    return;
  }

  window.__ABLY_FWC_LIVESYNC_DEBUG__ = {
    ...debug,
    updatedAt: new Date().toISOString()
  };
  window.dispatchEvent(
    new CustomEvent("ably-fwc-livesync-debug", {
      detail: window.__ABLY_FWC_LIVESYNC_DEBUG__
    })
  );
}

function normalizeLiveSyncMessage(channel, message) {
  const unwrappedData = unwrapLiveSyncPayload(message.data);
  const name = message.name || unwrappedData?.name || "unknown";
  const data =
    unwrappedData &&
    typeof unwrappedData === "object" &&
    "data" in unwrappedData &&
    (unwrappedData.name || unwrappedData.channel || unwrappedData.mutationId)
      ? unwrapLiveSyncPayload(unwrappedData.data)
      : unwrappedData;

  return {
    channel,
    name,
    data,
    receivedAt: new Date().toISOString()
  };
}

function unwrapLiveSyncPayload(data) {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  return data;
}

function useLiveSyncDebugSnapshot() {
  const [snapshot, setSnapshot] = useState(() =>
    typeof window === "undefined"
      ? null
      : (window.__ABLY_FWC_LIVESYNC_DEBUG__ ?? null)
  );

  useEffect(() => {
    function handleDebugEvent(event) {
      setSnapshot(event.detail);
    }

    window.addEventListener("ably-fwc-livesync-debug", handleDebugEvent);
    return () => {
      window.removeEventListener("ably-fwc-livesync-debug", handleDebugEvent);
    };
  }, []);

  return snapshot;
}

function useLiveSyncSubscriptions({ channels, onMessage }) {
  const [status, setStatus] = useState("initialized");
  const [debug, setDebug] = useState(() => ({
    subscribedChannels: [],
    lastMessage: null,
    lastMerge: null,
    lastError: null
  }));
  const channelKey = channels.join("|");

  useEffect(() => {
    const activeChannels = Array.from(new Set(channels.filter(Boolean)));

    setDebug((current) => ({
      ...current,
      subscribedChannels: activeChannels,
      lastError: null
    }));

    if (activeChannels.length === 0) {
      setStatus("initialized");
      const nextDebug = {
        subscribedChannels: [],
        lastMessage: null,
        lastMerge: "no channels to subscribe",
        lastError: null
      };
      setDebug(nextDebug);
      publishLiveSyncDebug({ status: "initialized", ...nextDebug });
      return undefined;
    }

    let client;
    let active = true;
    const subscriptions = [];

    logLiveSync("starting subscriptions", { channels: activeChannels });

    const handleConnectionState = (stateChange) => {
      if (active) {
        logLiveSync("connection state changed", {
          current: stateChange.current,
          previous: stateChange.previous,
          reason: stateChange.reason?.message
        });
        setStatus(stateChange.current);
        setDebug((current) => {
          const next = {
            ...current,
            lastError: stateChange.reason?.message ?? current.lastError
          };
          publishLiveSyncDebug({ status: stateChange.current, ...next });
          return next;
        });
      }
    };

    createLiveSyncClient()
      .then((liveSyncClient) => {
        client = liveSyncClient;

        if (!active) {
          client.close();
          return;
        }

        client.connection.on(handleConnectionState);

        for (const channelName of activeChannels) {
          const channel = client.channels.get(channelName);
          const listener = (message) => {
            if (!active) {
              return;
            }

            const normalizedMessage = normalizeLiveSyncMessage(
              channelName,
              message
            );
            logLiveSync("message received", {
              channel: normalizedMessage.channel,
              name: normalizedMessage.name,
              data: normalizedMessage.data
            });

            let mergeResult = "message handled";

            try {
              mergeResult =
                onMessage({
                  channel: normalizedMessage.channel,
                  name: normalizedMessage.name,
                  data: normalizedMessage.data,
                  rawMessage: message
                }) ?? mergeResult;
            } catch (error) {
              mergeResult = `merge failed: ${error.message}`;
              console.error("Failed to merge LiveSync message", error);
            }

            setDebug((current) => {
              const next = {
                ...current,
                lastMessage: {
                  channel: normalizedMessage.channel,
                  name: normalizedMessage.name,
                  receivedAt: normalizedMessage.receivedAt
                },
                lastMerge: mergeResult,
                lastError: mergeResult.startsWith("merge failed")
                  ? mergeResult
                  : null
              };
              publishLiveSyncDebug({ status, ...next });
              return next;
            });

            logLiveSync("message merge result", {
              channel: channelName,
              name: normalizedMessage.name,
              result: mergeResult
            });
          };

          subscriptions.push({ channel, listener });

          Promise.resolve(channel.subscribe(listener))
            .then(() => channel.attach())
            .then(() => {
              logLiveSync("subscribed and attached to channel", {
                channel: channelName
              });
              setDebug((current) => {
                const subscribedChannels = Array.from(
                  new Set([...current.subscribedChannels, channelName])
                );
                const next = {
                  ...current,
                  subscribedChannels,
                  lastMerge: `subscribed and attached to ${channelName}`
                };
                publishLiveSyncDebug({ status, ...next });
                return next;
              });
            })
            .catch((error) => {
              console.error(`Failed to subscribe to ${channelName}`, error);
              if (active) {
                setStatus("failed");
                setDebug((current) => {
                  const next = {
                    ...current,
                    lastError: `Failed to subscribe to ${channelName}: ${error.message}`
                  };
                  publishLiveSyncDebug({ status: "failed", ...next });
                  return next;
                });
              }
            });
        }
      })
      .catch((error) => {
        console.error("Failed to start LiveSync client", error);
        if (active) {
          const nextStatus = error.message?.includes("Unable to get Ably token")
            ? "auth_failed"
            : "failed";
          setStatus(nextStatus);
          setDebug((current) => {
            const next = {
              ...current,
              lastError: error.message
            };
            publishLiveSyncDebug({ status: nextStatus, ...next });
            return next;
          });
        }
      });
    return () => {
      active = false;
      client?.connection.off(handleConnectionState);

      for (const { channel, listener } of subscriptions) {
        channel.unsubscribe(listener);
      }

      client?.close();
    };
  }, [channelKey, onMessage]);

  return { status, debug };
}

function normalizeLeaderboardEntries(entries) {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map((entry) => ({
    ...entry,
    points: Number(entry.points ?? entry.totalPoints ?? 0)
  }));
}

function normalizeActivityItems(data) {
  const rawItems = Array.isArray(data?.items)
    ? data.items
    : [data?.item ?? data].filter(Boolean);
  const receivedAt = new Date().toISOString();

  return rawItems.map((item) => {
    const payload = item.payload ?? {
      teamSlug: item.teamSlug,
      pointsDelta: item.pointsDelta,
      matchSlug: item.matchSlug,
      minute: item.minute
    };

    return {
      id: item.id,
      message: item.message ?? formatActivityPayload(payload),
      payload,
      createdAt: item.createdAt ?? item.created_at ?? receivedAt
    };
  });
}

function mergeActivityItems(currentItems = [], incomingItems = [], limit = 25) {
  const existingIds = new Set(
    currentItems
      .map((item) => item.id)
      .filter((id) => id !== null && id !== undefined)
  );
  const uniqueIncoming = incomingItems.filter(
    (item) =>
      item.id === null || item.id === undefined || !existingIds.has(item.id)
  );

  return [...uniqueIncoming, ...currentItems].slice(0, limit);
}

function formatEventType(eventType) {
  return eventType.replaceAll("_", " ");
}

function formatActivityPayload(payload) {
  if (!payload?.teamSlug) {
    return "Live update received";
  }

  const points =
    payload.pointsDelta === undefined
      ? ""
      : ` ${formatSigned(payload.pointsDelta)}`;
  return `${payload.teamSlug}${points}`;
}

function formatTeamLastEvent(event) {
  const eventType = event.eventType
    ? formatEventType(event.eventType)
    : "update";
  const points =
    event.pointsDelta === undefined
      ? ""
      : ` (${formatSigned(event.pointsDelta)})`;
  const minute = event.minute === undefined ? "" : `${event.minute}' `;

  return `${minute}${event.playerName ?? event.playerSlug ?? "Player"} ${eventType}${points}`;
}

function formatSigned(value) {
  return value > 0 ? `+${value}` : String(value);
}

function formatRank(rank) {
  return rank === null || rank === undefined ? "-" : rank;
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(value));
}

function getActivityItemKey(item, index) {
  return (
    item.id ??
    `${item.createdAt ?? "live"}:${item.message ?? "activity"}:${index}`
  );
}

function liveSyncStatusLabel(status) {
  const labels = {
    initialized: "LiveSync starting",
    connecting: "LiveSync connecting",
    connected: "LiveSync connected",
    disconnected: "LiveSync disconnected",
    suspended: "LiveSync suspended",
    closing: "LiveSync closing",
    closed: "LiveSync closed",
    failed: "LiveSync failed",
    auth_failed: "LiveSync setup error"
  };

  return labels[status] ?? `LiveSync ${status}`;
}

function liveSyncStatusColor(status) {
  if (status === "connected") {
    return "success";
  }

  if (
    status === "failed" ||
    status === "suspended" ||
    status === "auth_failed"
  ) {
    return "warning";
  }

  return "info";
}
