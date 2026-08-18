import { Box, Container, Link, Toolbar, Typography, AppBar } from '@mui/material';
import { NavLink } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', path: '/' },
  { label: 'Jira Analysis', path: '/jira/analysis' },
  { label: 'Sign in', path: '/signin' },
];

const MainLayout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <AppBar position="static" color="transparent" elevation={0} sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between', minHeight: 72 }}>
            <Box>
              <Typography variant="h6" component="div" sx={{ fontWeight: 700 }}>
                KPI Dash
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gerrit developer performance
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {navItems.map((item) => (
                <Link
                  component={NavLink}
                  key={item.path}
                  to={item.path}
                  underline="none"
                  color="text.secondary"
                  sx={{ '&.active': { color: 'primary.main', fontWeight: 600 } }}
                >
                  {item.label}
                </Link>
              ))}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {children}
      </Container>
    </Box>
  );
};

export default MainLayout;
