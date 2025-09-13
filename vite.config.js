// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // react/jsx-runtime modülünü doğru dosyaya yönlendiriyoruz:
      "react/jsx-runtime": resolve(
        __dirname,
        "node_modules/react/jsx-runtime.js"
      ),
      "react/jsx-dev-runtime": resolve(
        __dirname,
        "node_modules/react/jsx-dev-runtime.js"
      ),
    },
  },
  optimizeDeps: {
    force: true,
    include: [
      '@mui/material',
      '@mui/icons-material',
      '@mui/material/BottomNavigationAction',
      '@mui/material/Dialog',
      '@mui/material/Select',
      '@mui/material/MenuItem',
      '@mui/material/TextField',
      '@mui/material/Card',
      '@mui/material/IconButton',
      '@mui/material/CircularProgress',
      '@mui/material/Box',
      '@mui/material/Typography',
      '@mui/material/Button',
      '@mui/material/Grid',
      '@mui/material/useMediaQuery',
      '@mui/material/useTheme',
      '@mui/material/Accordion',
      '@mui/material/AccordionSummary',
      '@mui/material/AccordionDetails',
      '@mui/material/Chip',
      '@mui/material/Container',
      '@mui/material/List',
      '@mui/material/ListItem',
      '@mui/material/ListItemIcon',
      '@mui/material/ListItemText',
      '@mui/material/Avatar',
      '@mui/material/FormControl',
      '@mui/material/InputLabel',
      '@mui/material/DialogTitle',
      '@mui/material/DialogContent',
      '@mui/material/DialogActions',
    ],
  },
  server: {
    force: true,
  },
});
