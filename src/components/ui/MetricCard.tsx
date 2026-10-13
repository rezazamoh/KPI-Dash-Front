import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface MetricCardProps {
  title: ReactNode;
  value: string | number;
  subtitle?: ReactNode;
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
        {typeof title === 'string' || typeof title === 'number' ? (
          <Typography variant="subtitle2" color="text.secondary" noWrap>
            {title}
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>{title}</Box>
        )}
        <Typography variant="h4" sx={{ color: accent ?? 'text.primary' }}>
          {value}
        </Typography>
        {subtitle && (
          typeof subtitle === 'string' || typeof subtitle === 'number' ? (
            <Typography variant="body2" color="text.secondary" noWrap>
              {subtitle}
            </Typography>
          ) : (
            <Box sx={{ mt: 0.25 }}>{subtitle}</Box>
          )
        )}
      </Stack>
    </CardContent>
  </Card>
);

export default MetricCard;
