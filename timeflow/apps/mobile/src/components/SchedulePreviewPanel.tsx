/**
 * Inline schedule preview — mirrors web SchedulePreviewCard behavior.
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import type { Habit, SchedulePreview, Task } from '../lib/api';

type Props = {
  preview: SchedulePreview;
  tasks: Task[];
  habits: Habit[];
  onApply: () => void;
  onCancel: () => void;
  applying?: boolean;
  applied?: boolean;
};

export function SchedulePreviewPanel({
  preview,
  tasks,
  habits,
  onApply,
  onCancel,
  applying = false,
  applied = false,
}: Props) {
  const hasBlocks = preview.blocks.length > 0;

  const titleForBlock = (block: (typeof preview.blocks)[0]) => {
    if (block.taskId) {
      return tasks.find((t) => t.id === block.taskId)?.title ?? block.title ?? 'Task';
    }
    if (block.habitId) {
      return habits.find((h) => h.id === block.habitId)?.title ?? block.title ?? 'Habit';
    }
    return block.title ?? 'Block';
  };

  const formatRange = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    const date = s.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const t1 = s.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const t2 = e.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${t1} – ${t2}`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Schedule preview</Text>
        <View style={styles.confidenceBadge}>
          <Text style={styles.confidenceText}>{preview.confidence} confidence</Text>
        </View>
      </View>

      {preview.summary ? (
        <Text style={styles.summary}>{preview.summary}</Text>
      ) : null}

      {!hasBlocks ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>No tasks could be scheduled</Text>
          <Text style={styles.emptyBody}>
            Tasks may already be scheduled or conflict with fixed events. Ask Flow to schedule specific tasks or try another day.
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.blockList} nestedScrollEnabled>
          {preview.blocks.map((block, index) => (
            <View key={`${block.taskId ?? block.habitId ?? 'b'}-${index}`} style={styles.blockRow}>
              <View style={[styles.dot, block.habitId && !block.taskId ? styles.dotHabit : styles.dotTask]} />
              <View style={styles.blockText}>
                <Text style={styles.blockTitle}>{titleForBlock(block)}</Text>
                <Text style={styles.blockTime}>{formatRange(block.start, block.end)}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {preview.conflicts.length > 0 ? (
        <View style={styles.warnings}>
          <Text style={styles.warningsTitle}>Warnings</Text>
          {preview.conflicts.map((c, i) => (
            <Text key={i} style={styles.warningLine}>
              • {c}
            </Text>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onCancel}
          disabled={applying}
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed, applying && styles.disabled]}
        >
          <Text style={styles.btnSecondaryText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={onApply}
          disabled={applying || applied || !hasBlocks}
          style={({ pressed }) => [
            styles.btnPrimary,
            pressed && styles.pressed,
            (applying || applied || !hasBlocks) && styles.disabled,
          ]}
        >
          {applying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>{applied ? 'Applied' : 'Apply schedule'}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    backgroundColor: '#fff',
    overflow: 'hidden',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0BAF9A',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  confidenceBadge: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  confidenceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f766e',
  },
  summary: {
    padding: 16,
    fontSize: 14,
    color: '#334155',
    lineHeight: 20,
  },
  emptyBox: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  emptyBody: {
    marginTop: 6,
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
  },
  blockList: {
    maxHeight: 220,
    paddingHorizontal: 16,
  },
  blockRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e2e8f0',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 10,
  },
  dotTask: { backgroundColor: '#0BAF9A' },
  dotHabit: { backgroundColor: '#10b981' },
  blockText: { flex: 1 },
  blockTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  blockTime: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  warnings: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fef9c3',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fde047',
  },
  warningsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#854d0e',
    marginBottom: 6,
  },
  warningLine: {
    fontSize: 13,
    color: '#a16207',
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  btnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
