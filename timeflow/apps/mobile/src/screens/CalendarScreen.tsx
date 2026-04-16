/**
 * Calendar agenda + pending Flow schedule preview (parity with web /calendar overlay).
 */

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../lib/api';
import type { CalendarEvent, SchedulePreview } from '../lib/api';
import { useTasks } from '../hooks/useTasks';
import { SchedulePreviewPanel } from '../components/SchedulePreviewPanel';
import { loadSchedulePreview, clearSchedulePreview } from '../lib/schedulePreviewStorage';
import { friendlyApplyError } from '../lib/friendlyApplyError';

type DayBucket = { label: string; events: CalendarEvent[] };

function bucketEvents(events: CalendarEvent[]): DayBucket[] {
  const map = new Map<string, CalendarEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.start);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  const keys = [...map.keys()].sort();
  return keys.map((k) => {
    const date = new Date(k + 'T12:00:00');
    const label = date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
    return { label, events: map.get(k)! };
  });
}

export function CalendarScreen() {
  const { tasks, refresh: refreshTasks } = useTasks();
  const [habits, setHabits] = useState<api.Habit[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(start);
      end.setDate(end.getDate() + 14);
      const [list, habitList] = await Promise.all([
        api.getCalendarEvents(start.toISOString(), end.toISOString()),
        api.getHabits().catch(() => [] as api.Habit[]),
      ]);
      setEvents(list);
      setHabits(habitList);
    } catch (e) {
      console.warn('[Calendar] events fetch failed', e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchEvents();
      void (async () => {
        const p = await loadSchedulePreview();
        if (p && p.blocks && p.blocks.length > 0) {
          setPreview(p);
          setModalOpen(true);
          setApplyError(null);
        } else {
          setPreview(null);
          setModalOpen(false);
        }
      })();
    }, [fetchEvents])
  );

  const handleApplyPreview = async () => {
    if (!preview) return;
    setApplying(true);
    setApplyError(null);
    try {
      const applyBlocks: api.ApplyScheduleBlock[] = [];
      preview.blocks.forEach((block) => {
        if (block.taskId) {
          applyBlocks.push({ taskId: block.taskId, start: block.start, end: block.end });
        } else if (block.habitId) {
          applyBlocks.push({
            habitId: block.habitId,
            title: block.title,
            start: block.start,
            end: block.end,
          });
        }
      });
      await api.applySchedule(applyBlocks);
      await refreshTasks();
      await clearSchedulePreview();
      setPreview(null);
      setModalOpen(false);
      await fetchEvents();
    } catch (err) {
      const raw = err instanceof Error ? err.message : '';
      setApplyError(friendlyApplyError(raw));
    } finally {
      setApplying(false);
    }
  };

  const handleCancelPreview = async () => {
    await clearSchedulePreview();
    setPreview(null);
    setModalOpen(false);
    setApplyError(null);
  };

  const buckets = bucketEvents(events);

  if (loading && events.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0BAF9A" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={buckets}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.listPad}
        ListHeaderComponent={
          <Text style={styles.screenTitle}>Next two weeks</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{item.label}</Text>
            {item.events.map((ev, i) => (
              <View key={ev.id ?? `${ev.start}-${i}`} style={styles.eventRow}>
                <Text style={styles.eventTime}>
                  {new Date(ev.start).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </Text>
                <Text style={styles.eventTitle} numberOfLines={2}>
                  {ev.summary || '(No title)'}
                </Text>
              </View>
            ))}
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No calendar events in this range.</Text>
        }
      />

      <Modal visible={modalOpen && !!preview} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleCancelPreview} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Review Flow schedule</Text>
            <Text style={styles.modalHint}>
              You have a pending schedule from Flow. Apply to add it to Google Calendar, or cancel.
            </Text>
            <ScrollView style={styles.modalScroll}>
              {preview ? (
                <SchedulePreviewPanel
                  preview={preview}
                  tasks={tasks}
                  habits={habits}
                  onApply={handleApplyPreview}
                  onCancel={handleCancelPreview}
                  applying={applying}
                  applied={false}
                />
              ) : null}
              {applyError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{applyError}</Text>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPad: { padding: 16, paddingBottom: 32 },
  screenTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  eventTime: { width: 72, fontSize: 13, color: '#0BAF9A', fontWeight: '600' },
  eventTitle: { flex: 1, fontSize: 15, color: '#0f172a' },
  empty: { color: '#64748b', fontSize: 15, marginTop: 24, textAlign: 'center' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#f8fafc',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    paddingTop: 16,
    paddingHorizontal: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', paddingHorizontal: 8 },
  modalHint: {
    fontSize: 14,
    color: '#64748b',
    paddingHorizontal: 8,
    marginBottom: 8,
    lineHeight: 20,
  },
  modalScroll: { maxHeight: '100%' },
  errorBanner: {
    margin: 8,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#b91c1c', fontSize: 14 },
});
