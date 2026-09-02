import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Family, FamilyMember } from '../types/family';
import type { User } from '../types/user';

type UseFamilyResult = {
  family: Family | null;
  members: FamilyMember[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  createFamily: (name: string) => Promise<{ error: Error | null }>;
  joinFamily: (code: string) => Promise<{ error: Error | null }>;
  leaveFamily: () => Promise<{ error: Error | null }>;
};

export function useFamily(user: User | null): UseFamilyResult {
  const [family, setFamily] = useState<Family | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadFamily = useCallback(async () => {
    if (!user?.family_id) {
      setFamily(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    try {
      const [{ data: familyData }, { data: membersData }] = await Promise.all([
        supabase.from('families').select('*').eq('id', user.family_id).single(),
        supabase
          .from('family_members')
          .select('*, user:users(id, name, profile_image_url)')
          .eq('family_id', user.family_id),
      ]);

      setFamily(familyData);
      setMembers(membersData ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [user?.family_id]);

  useEffect(() => {
    loadFamily();
  }, [loadFamily]);

  const createFamily = useCallback(
    async (name: string): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('Not authenticated.') };
      }
      const { error } = await supabase.rpc('create_family', { family_name: name });
      if (!error) {
        await loadFamily();
      }
      return { error: error ? new Error(error.message) : null };
    },
    [user, loadFamily],
  );

  const joinFamily = useCallback(
    async (code: string): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('Not authenticated.') };
      }
      const { error } = await supabase.rpc('join_family', { invite_code: code });
      if (!error) {
        await loadFamily();
      }
      return { error: error ? new Error(error.message) : null };
    },
    [user, loadFamily],
  );

  const leaveFamily = useCallback(async (): Promise<{ error: Error | null }> => {
    if (!user) {
      return { error: new Error('Not authenticated.') };
    }
    const { error } = await supabase.from('family_members').delete().eq('user_id', user.id);
    return { error: error ? new Error(error.message) : null };
  }, [user]);

  return { family, members, loading, error, refetch: loadFamily, createFamily, joinFamily, leaveFamily };
}
