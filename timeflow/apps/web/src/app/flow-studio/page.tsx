'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Identity } from '@timeflow/shared';
import { Layout } from '@/components/Layout';
import { LoadingSpinner } from '@/components/ui';
import { IdentityStudioEvolutionPanel } from '@/components/identity-studio';
import { useEvolutionSurface } from '@/hooks/useEvolutionSurface';
import { useUser } from '@/hooks/useUser';
import * as api from '@/lib/api';

export default function FlowStudioPage() {
  const { user, isAuthenticated } = useUser();
  const evolutionEnabled = user?.identityEvolutionEnabled === true;
  const {
    mode: evolutionMode,
    states: evolutionStates,
    loading: evolutionLoading,
    refresh: refreshEvolution,
  } = useEvolutionSurface(isAuthenticated, evolutionEnabled);
  const [identities, setIdentities] = useState<Identity[]>([]);
  const [identitiesLoading, setIdentitiesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIdentities([]);
      setIdentitiesLoading(false);
      return;
    }

    let cancelled = false;
    setIdentitiesLoading(true);
    setLoadError(null);
    api
      .getIdentities()
      .then((data) => {
        if (cancelled) return;
        setIdentities(data.filter((identity) => identity.isActive));
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load identities.');
        setIdentities([]);
      })
      .finally(() => {
        if (!cancelled) setIdentitiesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <Layout>
      <div className="mx-auto max-w-7xl space-y-6 px-1 py-2">
        <div className="flex flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white/85 p-6 shadow-sm sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-700">
              Flow Studio
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Evolve Flow without slowing down your day
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Review identity progression, preview upcoming rewards, and customize Flow in a dedicated
              space away from the operational habits board.
            </p>
          </div>
          <Link
            href="/habits"
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50"
          >
            Back to Identity Studio
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700">
            {loadError}
          </div>
        ) : null}

        {identitiesLoading && identities.length === 0 ? (
          <div className="flex min-h-[16rem] items-center justify-center rounded-3xl border border-slate-200 bg-white/80">
            <LoadingSpinner label="Loading Flow Studio" />
          </div>
        ) : (
          <IdentityStudioEvolutionPanel
            evolutionEnabled={evolutionEnabled}
            isAuthenticated={isAuthenticated}
            surfaceMode={evolutionMode}
            evolutionStates={evolutionStates}
            identities={identities}
            loading={evolutionLoading || identitiesLoading}
            timeZone={user?.timeZone ?? 'UTC'}
            onRefresh={refreshEvolution}
          />
        )}
      </div>
    </Layout>
  );
}
