/**
 * User Hook
 *
 * React hook for managing user state and authentication.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { UserProfile, UserPreferencesUpdate } from '@timeflow/shared';
import * as api from '@/lib/api';

export function useUser() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getMe();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const updatePreferences = async (prefs: UserPreferencesUpdate) => {
    const updated = await api.updatePreferences(prefs);
    setUser(updated);
    return updated;
  };

  const logout = () => {
    api.clearAuthToken();
    setUser(null);
  };

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    refresh: fetchUser,
    updatePreferences,
    logout,
  };
}

