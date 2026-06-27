/**
 * Identity Studio — habits organized by identity (route: /habits).
 */

'use client';

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import { Layout } from '@/components/Layout';
import { Panel, SectionHeader, LoadingSpinner } from '@/components/ui';
import { useHabits } from '@/hooks/useHabits';
import { useEvolutionSurface } from '@/hooks/useEvolutionSurface';
import { FlowMascot } from '@/components/FlowMascot';
import {
  IdentityStudioRail,
  IdentityStudioSection,
  IdentityStudioActionStrip,
  IdentityStudioPageLayout,
  SortableHabitRow,
  HabitEditSheet,
  IdentityStudioInsightsDrawer,
  IdentityStudioCoachmark,
  IdentityStudioProgressSheet,
  IdentityStudioEvolutionPanel,
  resolveSectionExpansion,
} from '@/components/identity-studio';
import { track, hashHabitId } from '@/lib/analytics';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Link from 'next/link';
import type { Habit, Identity, IdentityEvolutionState } from '@timeflow/shared';
import * as api from '@/lib/api';
import { useUser } from '@/hooks/useUser';
import { useStudioSummary } from '@/hooks/useStudioSummary';
import { useHabitInsightsSeries } from '@/hooks/useHabitInsightsSeries';
import { IdentityProgressionSidebar } from '@/components/habits/IdentityProgressionSidebar';
import {
  getProgressIdentityIdFromSearch,
  removeProgressParamFromUrl,
} from '@/lib/identityProgressRoute';

function resolveGroupIdentity(
  key: string,
  bucketHabits: Habit[],
  identityList: Identity[]
): { identity: Identity | null; isUnassigned: boolean } {
  if (key === '__none__') {
    return { identity: null, isUnassigned: true };
  }
  const found = identityList.find((i) => i.id === key);
  if (found) return { identity: found, isUnassigned: false };
  const m = bucketHabits.find((h) => h.identityId === key)?.identityModel;
  if (m) {
    return {
      identity: {
        id: m.id,
        userId: '',
        name: m.name,
        description: null,
        color: m.color,
        icon: m.icon,
        sortOrder: 0,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
      isUnassigned: false,
    };
  }
  return { identity: null, isUnassigned: false };
}

export default function HabitsPage() {
  const { habits, loading, createHabit, updateHabit, deleteHabit } = useHabits();
  const { summary: studioSummary, rowByHabitId } = useStudioSummary(!loading && habits.length > 0);
  const adherenceByHabitId = useHabitInsightsSeries(!loading && habits.length > 0);
  const { user, isAuthenticated } = useUser();
  const {
    mode: evolutionMode,
    states: evolutionStates,
    loading: evolutionLoading,
    refresh: refreshEvolution,
  } = useEvolutionSurface(isAuthenticated, user?.identityEvolutionEnabled === true);

  useEffect(() => {
    if (user?.identityEvolutionEnabled === true) {
      void refreshEvolution();
    }
  }, [user?.identityEvolutionEnabled, refreshEvolution]);

  const [localHabits, setLocalHabits] = useState<Habit[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
  const [sheetHabit, setSheetHabit] = useState<Habit | null>(null);
  const [sheetInitialIdentityId, setSheetInitialIdentityId] = useState<string | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [insightsIdentityId, setInsightsIdentityId] = useState<string | null>(null);
  const [progressSheetOpen, setProgressSheetOpen] = useState(false);

  // Setup drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sync habits from hook to local state (sorted by priorityRank)
  useEffect(() => {
    const sorted = [...habits].sort((a, b) => (a.priorityRank || 0) - (b.priorityRank || 0));
    setLocalHabits(sorted);
  }, [habits]);

  useEffect(() => {
    if (loading) return;
    track('page.view.habits', {});
    track('studio.view', { habit_count: habits.length });
  }, [loading, habits.length]);

  const [identities, setIdentities] = useState<Identity[]>([]);
  const [focusedIdentityId, setFocusedIdentityId] = useState<string | null>(null);
  const [expandedSectionKeys, setExpandedSectionKeys] = useState<Set<string>>(
    () => new Set()
  );
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const progressIdentityId = getProgressIdentityIdFromSearch(window.location.search);
    if (!progressIdentityId) return;

    setFocusedIdentityId(progressIdentityId);
    setProgressSheetOpen(true);
    track('identity_progress_details_opened', { source: 'toast' });
  }, []);

  useEffect(() => {
    api.getIdentities().then(setIdentities).catch(() => {});
  }, []);

  const habitCountByIdentityId = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const h of localHabits) {
      if (h.identityId) {
        counts[h.identityId] = (counts[h.identityId] ?? 0) + 1;
      }
    }
    return counts;
  }, [localHabits]);

  const unassignedCount = useMemo(
    () => localHabits.filter((h) => !h.identityId).length,
    [localHabits]
  );

  const setSectionRef = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      sectionRefs.current.set(key, el);
    } else {
      sectionRefs.current.delete(key);
    }
  }, []);

  const handleFocusChange = useCallback((id: string | null) => {
    setFocusedIdentityId(id);
    if (id !== null) {
      setExpandedSectionKeys(new Set());
    }
    track('studio.focus_identity', {
      identity_id_hash: id ? hashHabitId(id) : 'all',
      focused: id !== null,
    });
  }, []);

  const handleMoveHabit = useCallback(
    async (habitId: string, identityId: string | null) => {
      await updateHabit(habitId, { identityId });
      track('studio.habit_moved', {
        habit_id_hash: hashHabitId(habitId),
        to_unassigned: identityId === null,
      });
    },
    [updateHabit]
  );

  const openInsights = useCallback((identityId: string | null) => {
    setInsightsIdentityId(identityId);
    setInsightsOpen(true);
    track('studio.insights_open', {
      scoped: identityId !== null,
      ...(identityId ? { identity_id_hash: hashHabitId(identityId) } : {}),
    });
  }, []);

  const closeProgressSheet = useCallback(() => {
    setProgressSheetOpen(false);
    if (typeof window === 'undefined') return;
    if (!getProgressIdentityIdFromSearch(window.location.search)) return;

    const nextUrl = removeProgressParamFromUrl(
      `${window.location.pathname}${window.location.search}`
    );
    window.history.replaceState(window.history.state, '', nextUrl);
  }, []);

  const openCreateSheet = useCallback((identityId?: string | null) => {
    setSheetMode('create');
    setSheetHabit(null);
    setSheetInitialIdentityId(identityId ?? focusedIdentityId);
    setSheetOpen(true);
  }, [focusedIdentityId]);

  const openEditSheet = useCallback((habit: Habit) => {
    setSheetMode('edit');
    setSheetHabit(habit);
    setSheetOpen(true);
  }, []);

  const insightsFilterHabitIds = useMemo(() => {
    if (!insightsIdentityId) return null;
    return new Set(
      localHabits.filter((h) => h.identityId === insightsIdentityId).map((h) => h.id)
    );
  }, [insightsIdentityId, localHabits]);

  const insightsIdentityName = useMemo(() => {
    if (!insightsIdentityId) return null;
    return identities.find((i) => i.id === insightsIdentityId)?.name ?? null;
  }, [insightsIdentityId, identities]);

  useEffect(() => {
    if (!focusedIdentityId) return;
    const el = sectionRefs.current.get(focusedIdentityId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedIdentityId]);

  const evolutionByIdentityId = useMemo(() => {
    const m = new Map<string, IdentityEvolutionState>();
    for (const s of evolutionStates) {
      m.set(s.identityId, s);
    }
    return m;
  }, [evolutionStates]);

  const showGroupedIdentityLayout = habits.length > 0;

  useEffect(() => {
    if (!showGroupedIdentityLayout) return;
    try {
      const k = 'tf_analytics_evolution_habits_layout';
      if (sessionStorage.getItem(k) === '1') return;
      sessionStorage.setItem(k, '1');
      track('identity.evolution.habits_layout_visible', {});
    } catch {
      /* private mode */
    }
  }, [showGroupedIdentityLayout]);

  useEffect(() => {
    if (!showGroupedIdentityLayout || evolutionMode !== 'preview') return;
    try {
      const k = 'tf_analytics_evolution_preview_visible_habits';
      if (sessionStorage.getItem(k) === '1') return;
      sessionStorage.setItem(k, '1');
      track('identity.evolution.preview_visible', { source: 'habits' });
    } catch {
      /* private mode */
    }
  }, [showGroupedIdentityLayout, evolutionMode]);

  type HabitGroupRow = {
    key: string;
    identity: Identity | null;
    isUnassigned: boolean;
    habits: Habit[];
  };

  const habitGroups = useMemo((): HabitGroupRow[] => {
    if (!showGroupedIdentityLayout) {
      return [];
    }
    const order: string[] = [];
    const buckets = new Map<string, Habit[]>();
    for (const h of localHabits) {
      const raw = h.identityId;
      const key = raw ?? '__none__';
      if (!buckets.has(key)) {
        buckets.set(key, []);
        if (raw) order.push(key);
      }
      buckets.get(key)!.push(h);
    }
    const rows: HabitGroupRow[] = [];
    for (const identity of [...identities].sort((a, b) => a.sortOrder - b.sortOrder)) {
      if (!buckets.has(identity.id)) {
        buckets.set(identity.id, []);
        order.push(identity.id);
      }
    }
    for (const key of order) {
      const bucket = buckets.get(key)!;
      const { identity, isUnassigned } = resolveGroupIdentity(key, bucket, identities);
      rows.push({ key, identity, isUnassigned, habits: bucket });
    }
    const un = buckets.get('__none__');
    if (un?.length) {
      rows.push({
        key: '__none__',
        identity: null,
        isUnassigned: true,
        habits: un,
      });
    }
    rows.sort((a, b) => {
      if (a.isUnassigned) return 1;
      if (b.isUnassigned) return -1;
      const ai = identities.findIndex((i) => i.id === a.key);
      const bi = identities.findIndex((i) => i.id === b.key);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
    return rows;
  }, [showGroupedIdentityLayout, localHabits, identities]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this habit?')) {
      return;
    }

    try {
      await deleteHabit(id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete habit');
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = localHabits.findIndex((h) => h.id === active.id);
    const newIndex = localHabits.findIndex((h) => h.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update local state
    const reordered = arrayMove(localHabits, oldIndex, newIndex);
    setLocalHabits(reordered);
    setIsReordering(true);

    try {
      // Send new order to backend
      const habitIds = reordered.map((h) => h.id);
      await api.reorderHabits(habitIds);

      track('habits.reordered', {
        from: oldIndex,
        to: newIndex,
      });
    } catch (err) {
      console.error('Failed to reorder habits:', err);
      // Revert on error
      setLocalHabits(habits);
      alert('Failed to save new order. Please try again.');
    } finally {
      setIsReordering(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <LoadingSpinner size="lg" label="Loading habits" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div
        className={`${showGroupedIdentityLayout ? 'max-w-6xl' : 'max-w-4xl'} mx-auto space-y-6`}
      >
        <SectionHeader
          title="Identity Studio"
          subtitle="Build your identities through the habits that shape them."
          count={habits.length}
          actions={
            <div className="flex items-center gap-2">
              {habits.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => openInsights(null)}
                    className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Insights
                  </button>
                  <button
                    type="button"
                    onClick={() => setProgressSheetOpen(true)}
                    className="lg:hidden px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Progress
                  </button>
                </>
              )}
              <Link
                href="/settings/identities"
                className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-1.5"
              >
                <span>🎯</span> Manage Identities
              </Link>
              <button
                onClick={() => openCreateSheet(null)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium text-sm"
              >
                Add Habit
              </button>
            </div>
          }
        />

        {habits.length > 0 ? (
          <>
            <IdentityStudioPageLayout
              actionStrip={
                <IdentityStudioActionStrip
                  dueTodayCount={studioSummary?.strip.dueTodayCount}
                  atRiskCount={studioSummary?.strip.atRiskCount}
                  unscheduledCount={studioSummary?.strip.unscheduledWeekCount}
                  focusedIdentityId={focusedIdentityId}
                />
              }
              rail={
                <div className="space-y-3">
                  <IdentityStudioCoachmark />
                  <IdentityStudioRail
                    identities={identities}
                    unassignedCount={unassignedCount}
                    habitCountByIdentityId={habitCountByIdentityId}
                    focusedIdentityId={focusedIdentityId}
                    onFocusChange={handleFocusChange}
                  />
                </div>
              }
              sidebar={
                showGroupedIdentityLayout ? (
                  <IdentityProgressionSidebar
                    surfaceMode={evolutionMode}
                    evolutionStates={evolutionStates}
                    identities={identities}
                    timeZone={user?.timeZone ?? 'UTC'}
                    focusedIdentityId={focusedIdentityId}
                    onRefresh={refreshEvolution}
                    onRetry={() => void refreshEvolution()}
                  />
                ) : undefined
              }
            >
              <IdentityStudioEvolutionPanel
                evolutionEnabled={user?.identityEvolutionEnabled === true}
                isAuthenticated={isAuthenticated}
                surfaceMode={evolutionMode}
                evolutionStates={evolutionStates}
                identities={identities}
                loading={evolutionLoading}
                timeZone={user?.timeZone ?? 'UTC'}
                focusedIdentityId={focusedIdentityId}
                onRefresh={refreshEvolution}
              />

              <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Habits by identity
                </p>
                <p className="text-xs text-slate-500">Drag to reorder within a section</p>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localHabits.map((h) => h.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid min-w-0 gap-3 overflow-visible">
                    {habitGroups.map((group) => {
                      const expansion = resolveSectionExpansion(
                        group.key,
                        focusedIdentityId,
                        expandedSectionKeys
                      );
                      return (
                        <IdentityStudioSection
                          key={group.key}
                          sectionKey={group.key}
                          identity={group.identity}
                          isUnassigned={group.isUnassigned}
                          habits={group.habits}
                          evolution={
                            group.isUnassigned
                              ? null
                              : evolutionByIdentityId.get(group.key) ?? null
                          }
                          expansion={expansion}
                          compact
                          sectionRef={(el) => setSectionRef(group.key, el)}
                          onExpandMore={() => {
                            setExpandedSectionKeys((prev) => {
                              const next = new Set(prev);
                              next.add(group.key);
                              return next;
                            });
                          }}
                          onAddHabit={
                            group.identity && !group.isUnassigned
                              ? () => openCreateSheet(group.identity!.id)
                              : undefined
                          }
                          weekProgress={
                            studioSummary?.weekProgressByIdentityId[group.key]
                          }
                        >
                          {group.habits.map((habit) => (
                            <SortableHabitRow
                              key={habit.id}
                              habit={habit}
                              rowStatus={rowByHabitId?.get(habit.id) ?? null}
                              adherenceSeries={adherenceByHabitId.get(habit.id)}
                              variant={expansion === 'collapsed-preview' ? 'compact' : 'default'}
                              onEdit={openEditSheet}
                              onDelete={handleDelete}
                              isDisabled={isReordering}
                              identities={identities}
                              onMoveToIdentity={handleMoveHabit}
                            />
                          ))}
                        </IdentityStudioSection>
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </IdentityStudioPageLayout>
          </>
        ) : (
          <Panel>
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <FlowMascot size="xl" expression="encouraging" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">No habits yet!</h3>
              <p className="text-slate-600 mb-6">
                Create your first habit to start building better routines with Flow
              </p>
              <button
                onClick={() => openCreateSheet(null)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium shadow-md hover:shadow-lg"
              >
                Create Your First Habit
              </button>
            </div>
          </Panel>
        )}
      </div>

      <HabitEditSheet
        open={sheetOpen}
        mode={sheetMode}
        habit={sheetHabit}
        initialIdentityId={sheetInitialIdentityId}
        identities={identities}
        onClose={() => setSheetOpen(false)}
        onCreate={async (payload) => {
          await createHabit(payload);
        }}
        onUpdate={async (id, payload) => {
          await updateHabit(id, payload);
        }}
      />

      <IdentityStudioInsightsDrawer
        open={insightsOpen}
        filterHabitIds={insightsFilterHabitIds}
        filterIdentityId={insightsIdentityId}
        filterIdentityName={insightsIdentityName}
        onClose={() => setInsightsOpen(false)}
      />

      <IdentityStudioProgressSheet
        open={progressSheetOpen}
        onClose={closeProgressSheet}
        surfaceMode={evolutionMode}
        evolutionStates={evolutionStates}
        identities={identities}
        timeZone={user?.timeZone ?? 'UTC'}
        focusedIdentityId={focusedIdentityId}
        onRefresh={refreshEvolution}
        onRetry={() => void refreshEvolution()}
      />
    </Layout>
  );
}
