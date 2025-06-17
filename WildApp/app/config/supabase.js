import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xnjgkayzqcsgwfpzznrf.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuamdrYXl6cWNzZ3dmcHp6bnJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMjEyMTUsImV4cCI6MjA2NTY5NzIxNX0.pgJsFRTIhlYfZ1k7yOAB89NiQAp1-z2tQXh2zZEXvzQ'

export const supabase = createClient(supabaseUrl, supabaseKey)