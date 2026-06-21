import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  define: {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://muzrllgnyzwbtcyqybwy.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im11enJsbGdueXp3YnRjeXF5Ynd5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNTcyMzcsImV4cCI6MjA5NzYzMzIzN30.RxI8oPXpffblvO601q6RmlT67AcxW_MOvnw6VLJXVLU'),
  },
});
