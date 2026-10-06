import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createNotificationHandler } from './handler.ts'

serve(createNotificationHandler(createClient))
