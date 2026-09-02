import { useAuthContext } from '../contexts/AuthContext';

export function useAuth(): ReturnType<typeof useAuthContext> {
  return useAuthContext();
}
