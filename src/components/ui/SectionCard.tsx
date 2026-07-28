import { Card, CardContent, Typography } from '@mui/material';

const SectionCard: React.FC<React.PropsWithChildren<{ title: string }>> = ({ title, children }) => (
  <Card sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

export default SectionCard;
