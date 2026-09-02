import { Platform } from 'react-native';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '../types/user';

type UseProfileResult = {
  profile: User | null;
  loading: boolean;
  error: Error | null;
  updateProfile: (patch: Partial<Pick<User, 'name' | 'profile_image_url'>>) => Promise<{ error: Error | null }>;
  uploadAvatar: (uri: string) => Promise<{ url: string | null; error: Error | null }>;
};

export function useProfile(userId: string | null): UseProfileResult {
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (queryError) {
        throw queryError;
      }
      setProfile(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<User, 'name' | 'profile_image_url'>>): Promise<{ error: Error | null }> => {
      if (!userId) {
        return { error: new Error('Not authenticated.') };
      }
      const { error: updateError } = await supabase.from('users').update(patch).eq('id', userId);
      if (!updateError) {
        await loadProfile();
      }
      return { error: updateError ? new Error(updateError.message) : null };
    },
    [userId, loadProfile],
  );

  const uploadAvatar = useCallback(
    async (uri: string): Promise<{ url: string | null; error: Error | null }> => {
      if (!userId) {
        return { url: null, error: new Error('Not authenticated.') };
      }
      try {
        const ext = uri.split('.').pop() ?? 'jpg';
        const path = `${userId}/avatar-${Date.now()}.${ext}`;

        const fileBody =
          Platform.OS === 'web'
            ? await (await fetch(uri)).blob()
            : ({ uri, type: 'image/jpeg', name: path } as unknown as Blob);

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, fileBody);

        if (uploadError) {
          return { url: null, error: new Error(uploadError.message) };
        }

        const { data } = supabase.storage.from('avatars').getPublicUrl(path);
        return { url: data.publicUrl, error: null };
      } catch (err) {
        return { url: null, error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [userId],
  );

  return { profile, loading, error, updateProfile, uploadAvatar };
}
