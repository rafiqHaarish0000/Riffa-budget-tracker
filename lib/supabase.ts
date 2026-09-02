import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * True when both Supabase credentials are present. When false, the app runs in
 * development fallback mode so UI screens render without Supabase.
 */
export const isSupabaseConfigured = supabaseUrl !== '' && supabaseAnonKey !== '';

const notConfiguredError = new Error(
  '[supabase] Not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
);

/**
 * Replacement for PostgrestError so consumers can read `.message` the same way
 * whether in fallback mode or connected to a real Supabase project.
 */
const devError = { message: notConfiguredError.message, details: '', hint: '', code: 'DEV_NOT_CONFIGURED' } as const;

// ---------------------------------------------------------------------------
// Development fallback client
//
// Mirrors the subset of the Supabase API used by the app, returning safe
// "empty / not configured" results instead of throwing. It is replaced by the
// real client the moment EXPO_PUBLIC_* vars are provided. It never touches the
// network and contains no credentials.
// ---------------------------------------------------------------------------

type QueryPayload<T = unknown> = { data: T | null; error: typeof devError | null };
type MutationPayload = { data: null; error: typeof devError | null };
type VoidPayload = { error: typeof devError | null };

const emptyRowsResult = (): QueryPayload<never[]> => ({ data: [], error: null });
const emptyRowResult = (): QueryPayload => ({ data: null, error: null });
const notConfiguredResult = (): MutationPayload => ({ data: null, error: devError });
const notConfiguredVoidResult = (): VoidPayload => ({ error: devError });

type DevQueryBuilder = QueryPayload<never[]> & {
  select: () => DevQueryBuilder;
  eq: () => DevQueryBuilder;
  order: () => DevQueryBuilder;
  limit: () => DevQueryBuilder;
  single: () => Promise<QueryPayload>;
  maybeSingle: () => Promise<QueryPayload>;
  insert: () => Promise<MutationPayload>;
  update: () => Promise<MutationPayload>;
  delete: () => Promise<VoidPayload>;
};

function devQueryBuilder(): DevQueryBuilder {
  const builder = {
    ...emptyRowsResult(),
    select: () => devQueryBuilder(),
    eq: () => devQueryBuilder(),
    order: () => devQueryBuilder(),
    limit: () => devQueryBuilder(),
    single: () => Promise.resolve(emptyRowResult()),
    maybeSingle: () => Promise.resolve(emptyRowResult()),
    insert: () => Promise.resolve(notConfiguredResult()),
    update: () => Promise.resolve(notConfiguredResult()),
    delete: () => Promise.resolve(notConfiguredVoidResult()),
  } as DevQueryBuilder;

  // Make the builder awaitable so a terminal `.select()/.eq()/.order()` chain
  // resolves as an array result — matching how consumers destructure `data`.
  const thenable = {
    ...builder,
    then(resolve: (value: QueryPayload<never[]>) => void) {
      resolve(emptyRowsResult());
    },
  };

  return thenable;
}

function devStorageBucket() {
  return {
    upload: () => Promise.resolve(notConfiguredResult()),
    getPublicUrl: () =>
      Promise.resolve({ data: { publicUrl: '' }, error: null }) as Promise<{
        data: { publicUrl: string };
        error: null;
      }>,
    remove: () => Promise.resolve(notConfiguredResult()),
    list: () => Promise.resolve(emptyRowsResult()),
  };
}

const devSupabase = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    onAuthStateChange: (_callback: (event: string, session: null) => void) => ({
      data: { subscription: { unsubscribe: () => {} } },
    }),
    signInWithIdToken: () => Promise.resolve(notConfiguredResult()),
    signInWithOAuth: () => Promise.resolve(notConfiguredResult()),
    signOut: () => Promise.resolve(notConfiguredVoidResult()),
    setSession: () => Promise.resolve(notConfiguredVoidResult()),
  },
  from: (_table: string) => devQueryBuilder(),
  rpc: () => Promise.resolve(notConfiguredResult()),
  storage: {
    from: () => devStorageBucket(),
  },
} as const;

// ---------------------------------------------------------------------------
// Public client
// ---------------------------------------------------------------------------

function createSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured) {
    return devSupabase as unknown as SupabaseClient;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });
}

export const supabase = createSupabaseClient();

if (!isSupabaseConfigured) {
  console.warn(
    '[supabase] Development fallback mode is active. ' +
      'Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to enable the real client.',
  );
}
