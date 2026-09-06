import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
              return 'vendor-react';
            }
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('pdfjs-dist') || id.includes('pdfmake')) {
              return 'vendor-pdf';
            }
            if (id.includes('@tiptap') || id.includes('prosemirror')) {
              return 'vendor-editor';
            }
            if (id.includes('chart.js') || id.includes('react-chartjs-2')) {
              return 'vendor-chart';
            }
            if (id.includes('docx') || id.includes('xlsx')) {
              return 'vendor-office';
            }
            if (id.includes('@yudiel/react-qr-scanner') || id.includes('qrcode')) {
              return 'vendor-qr';
            }
            if (id.includes('lucide-react') || id.includes('react-icons')) {
              return 'vendor-icons';
            }
            if (id.includes('bootstrap') || id.includes('react-spinners') || id.includes('aos')) {
              return 'vendor-ui';
            }
            if (id.includes('axios')) {
              return 'vendor-http';
            }
            return 'vendor-misc';
          }
        },
      },
    },
  },
});
