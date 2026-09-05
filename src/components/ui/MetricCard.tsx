import { Card, CardContent, Stack, Typography } from '@mui/material';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, subtitle, accent }) => (
  <Card
    sx={{
      height: '100%',
      minHeight: 144,
      bgcolor: 'background.paper',
      border: '1px solid rgba(255,255,255,0.08)',
    }}
  >
    <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%' }}>
      <Stack spacing={1}>
        <Typography variant="subtitle2" color="text.secondary" noWrap>
          {title}
        </Typography>
        <Typography variant="h4" sx={{ color: accent ?? 'text.primary' }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {subtitle}
          </Typography>
        )}
      </Stack>
    </CardContent>
  </Card>
);

export default MetricCard;
