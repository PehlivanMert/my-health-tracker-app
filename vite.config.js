// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'public',
      filename: 'firebase-messaging-sw.js',
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
        type: 'module',
      },
      injectManifest: {
        injectionPoint: 'self.__WB_MANIFEST',
      },
      manifest: {
        short_name: "StayHealthyWith.me",
        name: "StayHealthyWith.me - Kişisel Sağlık ve Rutin Takip Sistemi",
        icons: [
          {
            src: "/logo4.jpeg",
            type: "image/jpeg",
            sizes: "192x192",
            purpose: "any maskable"
          },
          {
            src: "/logo4.jpeg",
            type: "image/jpeg",
            sizes: "512x512",
            purpose: "any maskable"
          }
        ],
        start_url: "/",
        display: "standalone",
        theme_color: "#1976d2",
        background_color: "#ffffff"
      }
    })
  ],
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
      "@": resolve(__dirname, "./src"),
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'calendar': ['@fullcalendar/react', '@fullcalendar/daygrid', '@fullcalendar/timegrid', '@fullcalendar/interaction', '@fullcalendar/multimonth', '@fullcalendar/rrule'],
          'charts': ['recharts'],
          'ui': ['@mui/material', '@mui/icons-material', 'framer-motion', 'lucide-react'],
        }
      }
    },
    chunkSizeWarningLimit: 800,
  }
});
