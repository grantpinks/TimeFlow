'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';
import {
  DEFAULT_FLOW_CUSTOMIZATION,
  mergeFlowCustomization,
  type FlowCustomizationFields,
} from '@/lib/flowCustomization';
import type { FlowCustomizationState } from '@timeflow/shared';

export type FlowCustomizationContextValue = {
  customization: FlowCustomizationFields;
  loading: boolean;
  refresh: () => Promise<void>;
};

const FlowCustomizationContext = createContext<FlowCustomizationContextValue | null>(null);

export function FlowCustomizationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useUser();
  const [customization, setCustomization] = useState<FlowCustomizationFields>(DEFAULT_FLOW_CUSTOMIZATION);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user?.identityEvolutionEnabled) {
      setCustomization(DEFAULT_FLOW_CUSTOMIZATION);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getFlowCustomization();
      setCustomization(mergeFlowCustomization(data as Partial<FlowCustomizationState>));
    } catch {
      setCustomization(DEFAULT_FLOW_CUSTOMIZATION);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.identityEvolutionEnabled]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      customization,
      loading,
      refresh,
    }),
    [customization, loading, refresh]
  );

  return <FlowCustomizationContext.Provider value={value}>{children}</FlowCustomizationContext.Provider>;
}

export function useFlowCustomization(): FlowCustomizationContextValue {
  const ctx = useContext(FlowCustomizationContext);
  if (!ctx) {
    return {
      customization: DEFAULT_FLOW_CUSTOMIZATION,
      loading: false,
      refresh: async () => {},
    };
  }
  return ctx;
}
