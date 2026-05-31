import { useMemo, useState } from 'react';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  CssBaseline,
  Divider,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  ThemeProvider,
  Toolbar,
  Typography,
  createTheme
} from '@mui/material';
import { Link as RouterLink, NavLink, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { APP_NAME } from '@ably-fantasy-world-cup/shared';

const demoLeagueSlug = 'world-cup-demo';
const demoUserSlug = 'captain-demo';

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
    description: 'Operator surface for match simulation controls and backend-confirmed processing status.'
  },
  {
    title: 'Client View',
    route: `/client/${demoUserSlug}`,
    description: 'Player-facing fantasy experience for a seeded demo user.'
  },
  {
    title: 'League Table',
    route: `/league/${demoLeagueSlug}`,
    description: 'League standings placeholder. Rankings will come from synced backend state.'
  },
  {
    title: 'TV Mode',
    route: `/tv/${demoLeagueSlug}`,
    description: 'Presentation-friendly display for the demo league.'
  },
  {
    title: 'Debug',
    route: '/debug',
    description: 'Diagnostics placeholder for LiveSync model state and event traces.'
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
          <Route path="control-room" element={<PlaceholderPage type="control-room" />} />
          <Route path="client/:userSlug" element={<ClientPage />} />
          <Route path="league/:leagueSlug" element={<LeaguePage />} />
          <Route path="tv/:leagueSlug" element={<TvPage />} />
          <Route path="debug" element={<PlaceholderPage type="debug" />} />
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
        description="Frontend shell only. These routes are placeholders until backend state, LiveSync models, and seeded demo data are implemented."
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
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography component="h2" variant="h3">
              {title}
            </Typography>
            <Chip label="Placeholder" size="small" color="secondary" variant="outlined" />
          </Stack>
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

function ClientPage() {
  const { userSlug } = useParams();

  return <PlaceholderPage type="client" slugLabel="User slug" slugValue={userSlug} />;
}

function LeaguePage() {
  const { leagueSlug } = useParams();

  return <PlaceholderPage type="league" slugLabel="League slug" slugValue={leagueSlug} />;
}

function TvPage() {
  const { leagueSlug } = useParams();

  return <PlaceholderPage type="tv" slugLabel="League slug" slugValue={leagueSlug} />;
}

function PlaceholderPage({ type, slugLabel, slugValue }) {
  const page = pageContent[type];

  return (
    <Stack spacing={3}>
      <PageHeading eyebrow={page.eyebrow} title={page.title} description={page.description} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <PlaceholderCard title={page.primaryTitle} status={page.status}>
            <Typography color="text.secondary">{page.primaryBody}</Typography>
            {slugValue ? (
              <>
                <Divider />
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography variant="body2" color="text.secondary">
                    {slugLabel}
                  </Typography>
                  <Chip label={slugValue} color="primary" variant="outlined" />
                </Stack>
              </>
            ) : null}
          </PlaceholderCard>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <PlaceholderCard title="Next integration" status="Not connected">
            <Typography color="text.secondary">
              API calls, database state, and Ably LiveSync subscriptions will be added in later slices.
            </Typography>
          </PlaceholderCard>
        </Grid>
      </Grid>
    </Stack>
  );
}

function PlaceholderCard({ title, status, children }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
            <Typography component="h2" variant="h3">
              {title}
            </Typography>
            <Chip label={status} size="small" color="warning" variant="outlined" />
          </Stack>
          {children}
        </Stack>
      </CardContent>
    </Card>
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
        description="This frontend shell only includes the initial demo routes."
      />
      <Box>
        <Button component={RouterLink} to="/" variant="contained">
          Return to launcher
        </Button>
      </Box>
    </Stack>
  );
}

const pageContent = {
  'control-room': {
    eyebrow: 'Operator route',
    title: 'Control room',
    description: 'Placeholder for match event simulation and backend processing controls.',
    primaryTitle: 'Simulation controls',
    primaryBody: 'Controls will appear here after the API, database migrations, and transaction-backed event flow are implemented.',
    status: 'Pending'
  },
  client: {
    eyebrow: 'Client route',
    title: 'Fantasy client',
    description: 'Placeholder for a user-specific fantasy football view.',
    primaryTitle: 'User squad state',
    primaryBody: 'The client will render synced roster, score, and league state without calculating backend truth.',
    status: 'Pending'
  },
  league: {
    eyebrow: 'League route',
    title: 'League leaderboard',
    description: 'Placeholder for database-confirmed league standings.',
    primaryTitle: 'Standings table',
    primaryBody: 'Rankings and fantasy scores will be read from backend-confirmed state once LiveSync is wired in.',
    status: 'Pending'
  },
  tv: {
    eyebrow: 'Broadcast route',
    title: 'TV display',
    description: 'Placeholder for a presentation view of league movement and match moments.',
    primaryTitle: 'Live presentation',
    primaryBody: 'This route will later show a streamlined display fed by synced league and match state.',
    status: 'Pending'
  },
  debug: {
    eyebrow: 'Diagnostics route',
    title: 'Debug console',
    description: 'Placeholder for development diagnostics.',
    primaryTitle: 'Model state',
    primaryBody: 'LiveSync model snapshots, channel status, and event traces can be surfaced here later.',
    status: 'Pending'
  }
};
