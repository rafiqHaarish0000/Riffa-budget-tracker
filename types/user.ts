import type { User as SupabaseUser } from '@supabase/supabase-js';

export type User = {
  id: string;
  name: string | null;
  profile_image_url: string | null;
  family_id: string | null;
  created_at: string;
  email?: string | null;
};

export type AuthSessionUser = SupabaseUser;

export type OnboardingState = 'existing' | 'new';
