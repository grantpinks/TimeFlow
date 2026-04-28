'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'framer-motion';
import * as api from '@/lib/api';
import { track } from '@/lib/analytics';
import type { IdentityEvolutionState, IdentityUnlockItem } from '@timeflow/shared';
import { FlowMascot } from '@/components/FlowMascot';
import {
  allowedSlugsWithDefaults,
  buildAnimationPackOptions,
  buildEmoteOptions,
  buildPaletteOptions,
  buildStageVariantOptions,
  collectUnlockedCustomizationSlugs,
  mergeFlowCustomization,
  slugifyCustomizationValue,
  type FlowCustomizationFields,
} from '@/lib/flowCustomization';
import { useFlowCustomization } from './FlowCustomizationProvider';

type Props = {
  /** When false, renders nothing. */
  evolutionEnabled: boolean;
};

function leadingIdentityIdFromStates(states: IdentityEvolutionState[]): string | null {
  if (!Array.isArray(states) || states.length === 0) return null;
  const sorted = [...states].sort((a, b) => b.level - a.level || b.xp - a.xp);
  return sorted[0]?.identityId ?? null;
}

export function FlowCustomizationPanel({ evolutionEnabled }: Props) {
  const { refresh: refreshContext } = useFlowCustomization();
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [values, setValues] = useState<FlowCustomizationFields | null>(null);
  const [unlocks, setUnlocks] = useState<IdentityUnlockItem[]>([]);

  const load = useCallback(async () => {
    if (!evolutionEnabled) return;
    setLoading(true);
    setError(null);
    try {
      const [custom, evolution] = await Promise.all([
        api.getFlowCustomization(),
        api.getEvolutionState(),
      ]);
      const states = Array.isArray(evolution) ? evolution : [];
      const leadingId = leadingIdentityIdFromStates(states);
      let unlockList: IdentityUnlockItem[] = [];
      if (leadingId) {
        const res = await api.getIdentityUnlocks(leadingId);
        unlockList = res.unlocks ?? [];
      }
      setUnlocks(unlockList);
      setValues(mergeFlowCustomization(custom));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Flow customization.');
      setValues(null);
    } finally {
      setLoading(false);
    }
  }, [evolutionEnabled]);

  useEffect(() => {
    if (!evolutionEnabled) return;
    void load();
  }, [evolutionEnabled, load]);

  const { paletteOptions, emoteOptions, animOptions, stageOptions } = useMemo(() => {
    const { palettes, emotes, animationPacks, stageVariants } = collectUnlockedCustomizationSlugs(unlocks);
    return {
      paletteOptions: buildPaletteOptions(allowedSlugsWithDefaults(palettes, 'palette')),
      emoteOptions: buildEmoteOptions(allowedSlugsWithDefaults(emotes, 'emote')),
      animOptions: buildAnimationPackOptions(allowedSlugsWithDefaults(animationPacks, 'animation')),
      stageOptions: buildStageVariantOptions(allowedSlugsWithDefaults(stageVariants, 'stage')),
    };
  }, [unlocks]);

  const persistField = useCallback(
    async (key: keyof FlowCustomizationFields, raw: string) => {
      const slug = slugifyCustomizationValue(raw);
      setSavingKey(key);
      setError(null);
      try {
        const body: Partial<FlowCustomizationFields> = { [key]: slug };
        const updated = await api.updateFlowCustomization(body);
        const next = mergeFlowCustomization(updated);
        setValues(next);
        track('identity.flow_customization.saved', { fields: [key] });
        await refreshContext();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Save failed.');
      } finally {
        setSavingKey(null);
      }
    },
    [refreshContext]
  );

  if (!evolutionEnabled) return null;

  if (loading && !values) {
    return (
      <section
        className="rounded-2xl border border-teal-200/60 bg-slate-50/80 p-6 shadow-sm backdrop-blur-md dark:border-teal-900/40 dark:bg-slate-900/40"
        aria-busy="true"
        aria-label="Flow customization"
      >
        <p className="text-sm text-slate-600 dark:text-slate-400">Loading Flow look…</p>
      </section>
    );
  }

  if (!values) {
    return (
      <section className="rounded-2xl border border-red-200/70 bg-red-50/60 p-6 backdrop-blur-md dark:border-red-900/50 dark:bg-red-950/30">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Flow companion look</h2>
        <p className="mt-2 text-sm text-red-700 dark:text-red-300">{error ?? 'Something went wrong.'}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
        >
          Retry
        </button>
      </section>
    );
  }

  const previewMotionClass = prefersReducedMotion ? '' : 'motion-safe:animate-float';

  return (
    <section className="rounded-2xl border border-teal-200/50 bg-gradient-to-br from-teal-50/90 via-slate-50/80 to-slate-100/90 p-6 shadow-sm backdrop-blur-md dark:border-teal-900/35 dark:from-slate-900/70 dark:via-slate-900/60 dark:to-slate-950/80">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Flow companion look
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600 dark:text-slate-400">
            Unlock palettes and motion through identity progression. Only options you&apos;ve earned appear here.
          </p>
        </div>
        <div
          className={`flex shrink-0 justify-center rounded-xl border border-teal-200/40 bg-white/50 p-4 dark:border-teal-800/40 dark:bg-slate-800/50 ${previewMotionClass}`}
        >
          <FlowMascot size="lg" expression="happy" palette={values.selectedPalette} />
        </div>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <FieldBlock id="flow-custom-palette" label="Palette" description="Tint for Flow across the app.">
          <select
            id="flow-custom-palette"
            className="mt-2 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-inner backdrop-blur-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
            value={values.selectedPalette}
            disabled={!!savingKey}
            onChange={(e) => void persistField('selectedPalette', e.target.value)}
          >
            {paletteOptions.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock id="flow-custom-emote" label="Emote preset" description="Reserved for future mascot moods.">
          <select
            id="flow-custom-emote"
            className="mt-2 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-inner backdrop-blur-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
            value={values.selectedEmote}
            disabled={!!savingKey}
            onChange={(e) => void persistField('selectedEmote', e.target.value)}
          >
            {emoteOptions.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock id="flow-custom-anim" label="Animation pack" description="Subtle motion on supported Flow moments.">
          <select
            id="flow-custom-anim"
            className="mt-2 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-inner backdrop-blur-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
            value={values.selectedAnimationPack}
            disabled={!!savingKey}
            onChange={(e) => void persistField('selectedAnimationPack', e.target.value)}
          >
            {animOptions.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldBlock>

        <FieldBlock id="flow-custom-stage" label="Stage form" description="Visual form tied to identity stage unlocks.">
          <select
            id="flow-custom-stage"
            className="mt-2 w-full rounded-lg border border-slate-200/80 bg-white/70 px-3 py-2 text-sm text-slate-900 shadow-inner backdrop-blur-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 dark:border-slate-600 dark:bg-slate-900/60 dark:text-slate-100"
            value={values.selectedStageVariant}
            disabled={!!savingKey}
            onChange={(e) => void persistField('selectedStageVariant', e.target.value)}
          >
            {stageOptions.map((o) => (
              <option key={o.slug} value={o.slug}>
                {o.label}
              </option>
            ))}
          </select>
        </FieldBlock>
      </div>

      {savingKey ? (
        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
          Saving…
        </p>
      ) : null}
    </section>
  );
}

function FieldBlock({
  id,
  label,
  description,
  children,
}: {
  id: string;
  label: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/60 bg-white/40 p-4 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-900/40">
      <label className="block text-sm font-medium text-slate-800 dark:text-slate-200" htmlFor={id}>
        {label}
      </label>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
      {children}
    </div>
  );
}
