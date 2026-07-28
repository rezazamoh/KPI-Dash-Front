import { Alert, AlertTitle, Box } from '@mui/material';

const ErrorPanel: React.FC<{ title?: string; message: string }> = ({ title = 'Something went wrong', message }) => (
  <Box sx={{ my: 4 }}>
    <Alert severity="error">
      <AlertTitle>{title}</AlertTitle>
      {message}
    </Alert>
  </Box>
);

export default ErrorPanel;
