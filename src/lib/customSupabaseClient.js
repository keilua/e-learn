import { createClient } from '@supabase/supabase-js';

// Valeurs fournies par l'environnement (.env.local en local, variables du build en CI).
// Voir .env.example. La clé "anon" est publique par conception : la sécurité des
// données repose sur les politiques RLS, jamais sur le secret de cette clé.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
        'Configuration Supabase manquante : définissez VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY (voir .env.example).'
    );
}

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
