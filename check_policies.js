import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bwpgbtgfdijcnbsmhgsg.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3cGdidGdmZGlqY25ic21oZ3NnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDY5NzYsImV4cCI6MjA4MTQyMjk3Nn0.PE-zHVtZnMmZJrmrRLdg1JWa8YeU5OQ2ElNcVqhRrG8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('get_policies', { table_name: 'cupula_access' });
  console.log('Error:', error);
  console.log('Data:', data);
}

check();
