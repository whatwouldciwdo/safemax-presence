import { createBrowserClient } from '@supabase/ssr';
import { isProductionMode } from '../app-mode';

export const isSupabaseConfigured = (): boolean => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('your-project-id') &&
    url.startsWith('https://')
  );
};

export const isSupabaseEnabled = (): boolean =>
  isProductionMode();

export function assertProductionConfig(): void {
  if (isProductionMode() && !isSupabaseConfigured()) {
    throw new Error(
      'Mode production memerlukan NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY yang valid.'
    );
  }
}

export function createClient() {
  assertProductionConfig();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(url, key);
}
