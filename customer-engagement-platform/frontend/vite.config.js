import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Two independent HTML entries share this one Vite project/build:
// index.html (the staff app — login/Executive/Admin, no chat widget) and
// widget.html (the embeddable widget bundle any external site loads via
// public/embed.js). They share components/services but ship as separate
// bundles — the staff app never pulls in the widget's socket/chat code
// and vice versa.
export default defineConfig({
  envDir: '../',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        widget: fileURLToPath(new URL('./widget.html', import.meta.url)),
      },
    },
  },
})
