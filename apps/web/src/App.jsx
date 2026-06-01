import { useCallback, useEffect, useMemo, useState } from 'react';
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
} from '@mui/material';
import { Link as RouterLink, NavLink, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { APP_NAME } from '@ably-fantasy-world-cup/shared';
import {
  apiBaseUrl,
  getApiConfig,
  getClientTeam,
  getHealth,
  getLeaderboard,
  getLeagueActivity,
  getMatch,
  postSimulatorEvent
} from './api/client.js';
import { createLiveSyncClient } from './api/livesync.js';

const demoLeagueSlug = 'friends';
const demoUserSlug = 'stephanos';
const demoMatchSlug = 'france-england';

const navItems = [
  { label: 'Launcher', to: '/' },
  { label: 'Control Room', to: '/control-room' },
  { label: 'Client', to: `/client/${demoUserSlug}` },
  { label: 'League', to: `/league/${demoLeagueSlug}` },
  { label: 'TV', to: `/tv/${demoLeagueSlug}` },
  { label: 'Debug', to: '/debug' }
];

const launcherCards = [
  {
    title: 'Control Room',
    route: '/control-room',
    description: 'Trigger simulated match events and inspect the backend response.'
  },
  {
    title: 'Client View',
    route: `/client/${demoUserSlug}`,
    description: 'View a seeded manager, squad, score, rank, and recent activity.'
  },
  {
    title: 'League Table',
    route: `/league/${demoLeagueSlug}`,
    description: 'Read the database-confirmed Friends League leaderboard.'
  },
  {
    title: 'TV Mode',
    route: `/tv/${demoLeagueSlug}`,
    description: 'Open a presentation-friendly leaderboard display.'
  },
  {
    title: 'Debug',
    route: '/debug',
    description: 'Check API connectivity and available demo routes.'
  }
];

const simulatorActions = [
  {
    label: 'Mbappé goal',
    payload: { matchSlug: demoMatchSlug, eventType: 'goal', playerSlug: 'mbappe', minute: 72 }
  },
  {
    label: 'Kane goal',
    payload: { matchSlug: demoMatchSlug, eventType: 'goal', playerSlug: 'kane', minute: 73 }
  },
  {
    label: 'Bellingham assist',
    payload: { matchSlug: demoMatchSlug, eventType: 'assist', playerSlug: 'bellingham', minute: 75 }
  },
  {
    label: 'Saka yellow card',
    payload: { matchSlug: demoMatchSlug, eventType: 'yellow_card', playerSlug: 'saka', minute: 80 }
  }
];

function createAppTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: mode === 'light' ? '#007a5a' : '#32d6a0'
      },
      secondary: {
        main: mode === 'light' ? '#2855a7' : '#8fb4ff'
      },
      warning: {
        main: '#d17a00'
      },
      background: {
        default: mode === 'light' ? '#f5f7f8' : '#111418',
        paper: mode === 'light' ? '#ffffff' : '#1a2027'
      }
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily: ['Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700
      },
      h2: {
        fontSize: '1.75rem',
        fontWeight: 700
      },
      h3: {
        fontSize: '1.25rem',
        fontWeight: 700
      },
      button: {
        textTransform: 'none',
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
  const [mode, setMode] = useState(() => window.localStorage.getItem('themeMode') || 'light');
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  function handleModeChange(event) {
    const nextMode = event.target.checked ? 'dark' : 'light';
    setMode(nextMode);
    window.localStorage.setItem('themeMode', nextMode);
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route element={<RouteLayout mode={mode} onModeChange={handleModeChange} />}>
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
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
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
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Toolbar sx={{ gap: 2, alignItems: 'center', flexWrap: 'wrap', py: 1 }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h6"
          sx={{
            color: 'text.primary',
            fontWeight: 800,
            mr: { xs: 0, md: 2 },
            textDecoration: 'none'
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
            minWidth: { xs: '100%', md: 0 },
            overflowX: 'auto',
            order: { xs: 3, md: 2 },
            pb: { xs: 0.5, md: 0 }
          }}
        >
          {navItems.map((item) => (
            <Button
              key={item.to}
              component={NavLink}
              to={item.to}
              end={item.to === '/'}
              size="small"
              sx={{
                color: 'text.secondary',
                flex: '0 0 auto',
                whiteSpace: 'nowrap',
                '&.active': {
                  color: 'primary.main',
                  bgcolor: 'action.selected'
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Stack>

        <FormControlLabel
          control={<Switch checked={mode === 'dark'} onChange={onModeChange} />}
          label={mode === 'dark' ? 'Dark' : 'Light'}
          sx={{ ml: 'auto', order: { xs: 2, md: 3 } }}
        />
      </Toolbar>
    </AppBar>
  );
}

function DemoLauncherPage() {
  return (
    <Stack spacing={4}>
      <PageHeading
        eyebrow="Demo launcher"
        title="Choose a reference app view"
        description="Use the Control Room to send simulator events, then inspect database-confirmed LiveSync updates across league and team views."
      />

      <Grid container spacing={2}>
        {launcherCards.map((card) => (
          <Grid key={card.route} size={{ xs: 12, md: card.title === 'Debug' ? 12 : 6 }}>
            <CardAction title={card.title} route={card.route} description={card.description} />
          </Grid>
        ))}
      </Grid>
    </Stack>
  );
}

function CardAction({ title, route, description }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Typography component="h2" variant="h3">
            {title}
          </Typography>
          <Typography color="text.secondary">{description}</Typography>
          <Box>
            <Button component={RouterLink} to={route} variant="contained">
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
  const activityState = useAsyncData(() => getLeagueActivity(demoLeagueSlug), []);

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
        description="This simulates an upstream match data source."
      />

      {submitError ? <Alert severity="error">{submitError}</Alert> : null}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  Simulator events
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} flexWrap="wrap">
                  {simulatorActions.map((action) => (
                    <Button
                      key={action.label}
                      variant="contained"
                      onClick={() => handleSimulatorAction(action)}
                      disabled={Boolean(pendingAction)}
                    >
                      {pendingAction === action.label ? 'Sending...' : action.label}
                    </Button>
                  ))}
                </Stack>
                <Divider />
                <AsyncBlock state={matchState} emptyMessage="No match summary available.">
                  {(data) => <MatchSummary match={data.match} events={data.events} />}
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
                    Latest API response
                  </Typography>
                  {latestResponse ? (
                    <Stack spacing={2}>
                      <AffectedTeams teams={latestResponse.affectedTeams} />
                      <CodeBlock value={latestResponse} />
                    </Stack>
                  ) : (
                    <EmptyState message="Trigger an event to see the simulator response." />
                  )}
                </Stack>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardContent>
                <Stack spacing={2}>
                  <Typography component="h2" variant="h3">
                    Recent activity
                  </Typography>
                  <AsyncBlock state={activityState} emptyMessage="No activity yet.">
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
  const leaderboardState = useAsyncData(() => getLeaderboard(leagueSlug), [leagueSlug]);
  const activityState = useAsyncData(() => getLeagueActivity(leagueSlug), [leagueSlug]);
  const { updateData: updateLeaderboardData } = leaderboardState;
  const { updateData: updateActivityData } = activityState;
  const liveSyncChannels = useMemo(
    () => [`league:${leagueSlug}:leaderboard`, `league:${leagueSlug}:activity`],
    [leagueSlug]
  );
  const handleLiveSyncMessage = useCallback(
    ({ name, data }) => {
      if (name === 'leaderboard.updated') {
        updateLeaderboardData((current) => {
          if (data?.leagueSlug && data.leagueSlug !== leagueSlug) {
            return current;
          }

          return {
            ...current,
            leaderboard: normalizeLeaderboardEntries(data?.leaderboard)
          };
        });
      }

      if (name === 'activity.created') {
        updateActivityData((current) => {
          if (data?.leagueSlug && data.leagueSlug !== leagueSlug) {
            return current;
          }

          return {
            ...current,
            items: mergeActivityItems(current.items, normalizeActivityItems(data))
          };
        });
      }
    },
    [leagueSlug, updateActivityData, updateLeaderboardData]
  );
  const liveSyncStatus = useLiveSyncSubscriptions({
    channels: liveSyncChannels,
    onMessage: handleLiveSyncMessage
  });

  return (
    <Stack spacing={3}>
      <PageHeading
        eyebrow="League"
        title="League leaderboard"
        description="Initial standings load over HTTP; subsequent updates arrive through Ably LiveSync."
      />
      <LiveSyncStatus status={liveSyncStatus} channels={liveSyncChannels} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <AsyncBlock state={leaderboardState} emptyMessage="No leaderboard entries yet.">
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
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  Recent activity
                </Typography>
                <AsyncBlock state={activityState} emptyMessage="No activity yet.">
                  {(data) => <ActivityFeed items={data.items} />}
                </AsyncBlock>
              </Stack>
            </CardContent>
          </Card>
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
  const liveSyncChannels = useMemo(
    () => [
      `team:${userSlug}`,
      ...(clientLeagueSlug ? [`league:${clientLeagueSlug}:activity`] : [])
    ],
    [clientLeagueSlug, userSlug]
  );
  const handleLiveSyncMessage = useCallback(
    ({ name, data }) => {
      if (name === 'team.updated') {
        updateClientData((current) => {
          if (data?.userSlug && data.userSlug !== userSlug) {
            return current;
          }

          return {
            ...current,
            team: {
              ...current.team,
              slug: data?.teamSlug ?? current.team.slug,
              name: data?.teamName ?? current.team.name,
              points: Number(data?.points ?? data?.totalPoints ?? current.team.points),
              rank: data?.rank ?? current.team.rank,
              previousRank: data?.previousRank ?? current.team.previousRank,
              rankDelta: data?.rankDelta ?? current.team.rankDelta,
              lastEvent: data?.lastEvent ?? current.team.lastEvent,
              updatedAt: data?.updatedAt ?? current.team.updatedAt
            }
          };
        });
      }

      if (name === 'activity.created') {
        updateClientData((current) => {
          const incomingItems = normalizeActivityItems(data).filter(
            (item) => item.payload?.teamSlug === current.team.slug
          );

          if (incomingItems.length === 0) {
            return current;
          }

          return {
            ...current,
            activity: mergeActivityItems(current.activity, incomingItems, 10)
          };
        });
      }
    },
    [updateClientData, userSlug]
  );
  const liveSyncStatus = useLiveSyncSubscriptions({
    channels: liveSyncChannels,
    onMessage: handleLiveSyncMessage
  });

  return (
    <Stack spacing={3}>
      <PageHeading
        eyebrow="Fantasy client"
        title="Team state"
        description="Initial team state loads over HTTP; subsequent score, rank, squad, and activity updates arrive through Ably LiveSync."
      />
      <LiveSyncStatus status={liveSyncStatus} channels={liveSyncChannels} />

      <AsyncBlock state={clientState} emptyMessage="No team found for this user.">
        {(data) => (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 5 }}>
              <Card variant="outlined">
                <CardContent>
                  <Stack spacing={2}>
                    <Typography component="h2" variant="h3">
                      {data.team.name}
                    </Typography>
                    <Typography color="text.secondary">{data.user.name}</Typography>
                    <Stack direction="row" spacing={1} flexWrap="wrap">
                      <StatChip label="Points" value={data.team.points} />
                      <StatChip label="Rank" value={formatRank(data.team.rank)} />
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
  const leaderboardState = useAsyncData(() => getLeaderboard(leagueSlug), [leagueSlug]);
  const { updateData: updateLeaderboardData } = leaderboardState;
  const liveSyncChannels = useMemo(() => [`league:${leagueSlug}:leaderboard`], [leagueSlug]);
  const handleLiveSyncMessage = useCallback(
    ({ name, data }) => {
      if (name !== 'leaderboard.updated') {
        return;
      }

      updateLeaderboardData((current) => {
        if (data?.leagueSlug && data.leagueSlug !== leagueSlug) {
          return current;
        }

        return {
          ...current,
          leaderboard: normalizeLeaderboardEntries(data?.leaderboard)
        };
      });
    },
    [leagueSlug, updateLeaderboardData]
  );
  const liveSyncStatus = useLiveSyncSubscriptions({
    channels: liveSyncChannels,
    onMessage: handleLiveSyncMessage
  });

  return (
    <Box sx={{ py: { md: 4 } }}>
      <AsyncBlock state={leaderboardState} emptyMessage="No leaderboard entries yet.">
        {(data) => (
          <Stack spacing={3}>
            <LiveSyncStatus status={liveSyncStatus} channels={liveSyncChannels} compact />
            <Stack spacing={0.5}>
              <Typography variant="overline" color="primary" sx={{ fontWeight: 800 }}>
                TV leaderboard
              </Typography>
              <Typography component="h1" sx={{ fontSize: { xs: '2.75rem', md: '4rem' }, fontWeight: 800 }}>
                {data.league.name}
              </Typography>
            </Stack>
            <Paper variant="outlined" sx={{ overflow: 'hidden' }}>
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
                        <Typography sx={{ fontSize: '2rem', fontWeight: 800 }}>
                          {entry.rank}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: { xs: '1.5rem', md: '2.25rem' }, fontWeight: 800 }}>
                          {entry.teamName}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography sx={{ fontSize: { xs: '1.75rem', md: '2.75rem' }, fontWeight: 800 }}>
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
    </Box>
  );
}

function DebugPage() {
  const healthState = useAsyncData(getHealth, []);
  const configState = useAsyncData(getApiConfig, []);

  return (
    <Stack spacing={3}>
      <PageHeading
        eyebrow="Debug"
        title="Runtime diagnostics"
        description="Inspect API, Neon, and Ably LiveSync configuration for the demo."
      />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  API
                </Typography>
                <KeyValue label="Base URL" value={apiBaseUrl || 'same origin'} />
                <AsyncBlock state={healthState} emptyMessage="Health status unavailable.">
                  {(data) => <CodeBlock value={data} />}
                </AsyncBlock>
                <AsyncBlock state={configState} emptyMessage="Config unavailable.">
                  {(data) => <CodeBlock value={data} />}
                </AsyncBlock>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined">
            <CardContent>
              <Stack spacing={2}>
                <Typography component="h2" variant="h3">
                  Demo routes
                </Typography>
                <List dense disablePadding>
                  {navItems.map((item) => (
                    <ListItem key={item.to} disableGutters>
                      <Button component={RouterLink} to={item.to}>
                        {item.to}
                      </Button>
                    </ListItem>
                  ))}
                </List>
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
        <Chip label={`${match.homeTeam} vs ${match.awayTeam}`} color="primary" />
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
            <TableCell>Updated</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => (
            <TableRow key={entry.teamSlug}>
              <TableCell>{entry.rank}</TableCell>
              <TableCell>{entry.teamName}</TableCell>
              <TableCell>{entry.managerName || entry.managerSlug || 'Unassigned'}</TableCell>
              <TableCell align="right">{entry.points}</TableCell>
              <TableCell>{formatDateTime(entry.updatedAt)}</TableCell>
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
              <TableCell>{player.position || '-'}</TableCell>
              <TableCell>{player.nationality || '-'}</TableCell>
              <TableCell>{player.isCaptain ? <Chip label="Captain" size="small" color="primary" /> : '-'}</TableCell>
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
          <ListItemText primary={item.message} secondary={formatDateTime(item.createdAt)} />
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
          color={team.pointsDelta >= 0 ? 'primary' : 'warning'}
          variant="outlined"
        />
      ))}
    </Stack>
  );
}

function StatChip({ label, value }) {
  return <Chip label={`${label}: ${value}`} color="primary" variant="outlined" />;
}

function KeyValue({ label, value }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
      <Typography color="text.secondary">{label}</Typography>
      <Chip label={value} variant="outlined" />
    </Stack>
  );
}

function LiveSyncStatus({ status, channels, compact = false }) {
  const label = liveSyncStatusLabel(status);
  const color = liveSyncStatusColor(status);
  const description =
    status === 'auth_failed'
      ? 'LiveSync is not configured. Add ABLY_API_KEY and configure the Ably Postgres connector.'
      : `${label} for ${channels.length} channel${channels.length === 1 ? '' : 's'}.`;

  if (compact) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip label={label} color={color} variant="outlined" />
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    );
  }

  return (
    <Alert severity={status === 'connected' ? 'success' : status === 'auth_failed' ? 'error' : 'info'} icon={false}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
        <Chip label={label} color={color} size="small" />
        <Typography variant="body2">{description}</Typography>
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
        bgcolor: 'action.hover',
        borderRadius: 1,
        fontSize: '0.8125rem',
        m: 0,
        maxHeight: 300,
        overflow: 'auto',
        p: 2,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
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
      <Typography color="text.secondary" sx={{ maxWidth: 760 }}>
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
  const [state, setState] = useState({ data: null, error: null, loading: true });

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

function useLiveSyncSubscriptions({ channels, onMessage }) {
  const [status, setStatus] = useState('initialized');
  const channelKey = channels.join('|');

  useEffect(() => {
    const activeChannels = Array.from(new Set(channels.filter(Boolean)));

    if (activeChannels.length === 0) {
      setStatus('initialized');
      return undefined;
    }

    let client;
    let active = true;

    const handleConnectionState = (stateChange) => {
      if (active) {
        setStatus(stateChange.current);
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

            onMessage({
              channel: channelName,
              name: message.name,
              data: message.data
            });
          };

          channel.subscribe(listener).catch((error) => {
            console.error(`Failed to subscribe to ${channelName}`, error);
            if (active) {
              setStatus('failed');
            }
          });
        }
      })
      .catch((error) => {
        console.error('Failed to start LiveSync client', error);
        if (active) {
          setStatus(error.message?.includes('Unable to get Ably token') ? 'auth_failed' : 'failed');
        }
      });
    return () => {
      active = false;
      client?.connection.off(handleConnectionState);

      for (const channelName of activeChannels) {
        client?.channels.get(channelName).unsubscribe();
      }

      client?.close();
    };
  }, [channelKey, onMessage]);

  return status;
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
    currentItems.map((item) => item.id).filter((id) => id !== null && id !== undefined)
  );
  const uniqueIncoming = incomingItems.filter(
    (item) => item.id === null || item.id === undefined || !existingIds.has(item.id)
  );

  return [...uniqueIncoming, ...currentItems].slice(0, limit);
}

function formatEventType(eventType) {
  return eventType.replaceAll('_', ' ');
}

function formatActivityPayload(payload) {
  if (!payload?.teamSlug) {
    return 'Live update received';
  }

  const points = payload.pointsDelta === undefined ? '' : ` ${formatSigned(payload.pointsDelta)}`;
  return `${payload.teamSlug}${points}`;
}

function formatTeamLastEvent(event) {
  const eventType = event.eventType ? formatEventType(event.eventType) : 'update';
  const points = event.pointsDelta === undefined ? '' : ` (${formatSigned(event.pointsDelta)})`;
  const minute = event.minute === undefined ? '' : `${event.minute}' `;

  return `${minute}${event.playerName ?? event.playerSlug ?? 'Player'} ${eventType}${points}`;
}

function formatSigned(value) {
  return value > 0 ? `+${value}` : String(value);
}

function formatRank(rank) {
  return rank === null || rank === undefined ? '-' : rank;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function getActivityItemKey(item, index) {
  return item.id ?? `${item.createdAt ?? 'live'}:${item.message ?? 'activity'}:${index}`;
}

function liveSyncStatusLabel(status) {
  const labels = {
    initialized: 'LiveSync starting',
    connecting: 'LiveSync connecting',
    connected: 'LiveSync connected',
    disconnected: 'LiveSync disconnected',
    suspended: 'LiveSync suspended',
    closing: 'LiveSync closing',
    closed: 'LiveSync closed',
    failed: 'LiveSync failed',
    auth_failed: 'LiveSync setup error'
  };

  return labels[status] ?? `LiveSync ${status}`;
}

function liveSyncStatusColor(status) {
  if (status === 'connected') {
    return 'success';
  }

  if (status === 'failed' || status === 'suspended' || status === 'auth_failed') {
    return 'warning';
  }

  return 'info';
}
