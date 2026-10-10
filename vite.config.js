import base44 from "@base44/vite-plugin";
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import devAutomationEndpoint from "./src/dev-automation-endpoint";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    devAutomationEndpoint(),
    base44({
      legacySDKImports: process.env.BASE44_LEGACY_SDK === 'true',
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: true
    }),
    react()
  ]
})
