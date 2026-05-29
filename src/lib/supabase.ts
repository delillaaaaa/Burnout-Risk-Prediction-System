import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://njiifoaxqbmeacfvetvi.supabase.co'
const supabaseAnonKey = 'sb_publishable_2uqnV1g38wGU8kkNeUQbAw_jN2pk4F1'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)