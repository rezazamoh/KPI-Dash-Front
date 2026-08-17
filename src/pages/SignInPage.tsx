import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setusername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    navigate('/');
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          width: '100%',
          maxWidth: 420,
          bgcolor: 'background.paper',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 3,
          p: 4,
        }}
      >
        <Stack spacing={3}>
          <Stack spacing={0.5}>
            <Typography variant="h4">Sign in</Typography>
            <Typography color="text.secondary">Access the KPI dashboard</Typography>
          </Stack>

          <TextField
            fullWidth
            label="User"
            type="username"
            value={username}
            onChange={(event) => setusername(event.target.value)}
            required
          />

          <TextField
            fullWidth
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            sx={{ textTransform: 'none', fontWeight: 600, py: 1.5 }}
          >
            Sign in
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default SignInPage;
