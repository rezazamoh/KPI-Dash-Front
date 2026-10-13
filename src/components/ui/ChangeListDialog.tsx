import {
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Link,
  List,
  ListItem,
  Stack,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export interface ChangeListItem {
  change_number: number;
  title?: string;
}

export function ChangeListDialog({
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

export function ChangeListButton({
  items,
  title = 'Included changes',
  label = 'Show included changes',
  count,
}: {
  items: ChangeListItem[];
  title?: string;
  label?: string;
  count?: number;
}) {
  const [open, setOpen] = useState(false);
  const total = typeof count === 'number' ? count : items.length;

  if (!total) {
    return null;
  }

  return (
    <>
      <Button
        size="small"
        variant="text"
        onClick={() => setOpen(true)}
        sx={{
          textTransform: 'none',
          border: 'none',
          boxShadow: 'none',
          minWidth: 0,
          px: 0.5,
          '&:hover': {
            border: 'none',
            backgroundColor: 'transparent',
          },
          '&:focus-visible': {
            border: 'none',
            outline: 'none',
          },
        }}
      >
        {label} ({total})
      </Button>
      <ChangeListDialog
        open={open}
        onClose={() => setOpen(false)}
        items={items}
        title={title}
      />
    </>
  );
}

export default ChangeListDialog;
