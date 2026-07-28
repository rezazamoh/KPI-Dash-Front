import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingSpinner: React.FC<{ label?: string }> = ({ label = 'Loading' }) => (
  <Box sx={{ display: 'grid', placeItems: 'center', height: '40vh', gap: 2 }}>
    <CircularProgress color="secondary" />
    <Typography variant="body1" color="text.secondary">
      {label}
    </Typography>
  </Box>
);

export default LoadingSpinner;
