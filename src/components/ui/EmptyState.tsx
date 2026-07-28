import { Box, Typography } from '@mui/material';

const EmptyState: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <Box sx={{ textAlign: 'center', pt: 10, pb: 6, color: 'text.secondary' }}>
    <Typography variant="h5" gutterBottom>
      {title}
    </Typography>
    {subtitle && (
      <Typography variant="body1" sx={{ maxWidth: 600, mx: 'auto' }}>
        {subtitle}
      </Typography>
    )}
  </Box>
);

export default EmptyState;
