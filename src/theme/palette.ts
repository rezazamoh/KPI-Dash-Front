import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#0c1118',
      paper: '#131a25',
    },
    primary: {
      main: '#7c4dff',
    },
    secondary: {
      main: '#00bcd4',
    },
    text: {
      primary: '#f8fbff',
      secondary: '#cfd8fc',
    },
  },
  typography: {
    fontFamily: ['Inter', 'system-ui', 'sans-serif'].join(','),
    h4: {
      fontWeight: 700,
    },
    body1: {
      color: '#cfd8fc',
    },
  },
  shape: {
    borderRadius: 16,
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

export default theme;
