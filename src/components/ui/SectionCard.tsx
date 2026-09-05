import { Card, CardContent, Typography } from '@mui/material';
import type { SxProps, Theme } from '@mui/material';

const SectionCard: React.FC<
  React.PropsWithChildren<{ title: string; sx?: SxProps<Theme> }>
> = ({ title, children, sx }) => (
  <Card
    sx={{
      bgcolor: 'background.paper',
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      ...sx,
    }}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

export default SectionCard;
