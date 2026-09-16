import { Dialog, DialogContent, DialogTitle, Link, List, ListItem, Stack, Typography } from '@mui/material';

export interface ChangeListItem {
  change_number: number;
  title?: string;
}

export default function ChangeListDialog({
  open,
  onClose,
  items,
  title = 'Included changes',
}: {
  open: boolean;
  onClose: () => void;
  items: ChangeListItem[];
  title?: string;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <List dense>
          {items.map((item) => (
            <ListItem key={item.change_number} divider>
              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  <Link
                    href={`/gerrit/changes/${item.change_number}`}
                    underline="hover"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.change_number}
                  </Link>
                </Typography>
                {item.title ? (
                  <Typography variant="caption" color="text.secondary">
                    {item.title || 'No title'}
                  </Typography>
                ) : null}
              </Stack>
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
