import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://npregmaiklksxrixxblt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcmVnbWFpa2xrc3hyaXh4Ymx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTM0NzYsImV4cCI6MjA4Mjk2OTQ3Nn0.fhPJ8SQUlNz5XlzC81Vd88sRlN9XcJXfoXV1HNjxjfI';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
