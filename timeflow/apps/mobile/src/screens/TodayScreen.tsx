/**
 * Today Screen
 *
 * Shows tasks scheduled for today and upcoming tasks.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  SectionList,
} from 'react-native';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../lib/api';

interface Section {
  title: string;
  data: Task[];
}

export function TodayScreen() {
  const { tasks, loading, refresh } = useTasks();

  // Group tasks by date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  const scheduledTasks = tasks.filter((t) => t.status === 'scheduled' && t.scheduledTask);

  const todayTasks = scheduledTasks.filter((t) => {
    const taskDate = new Date(t.scheduledTask!.startDateTime);
    return taskDate >= today && taskDate < tomorrow;
  });

  const tomorrowTasks = scheduledTasks.filter((t) => {
    const taskDate = new Date(t.scheduledTask!.startDateTime);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    return taskDate >= tomorrow && taskDate < dayAfterTomorrow;
  });

  const upcomingTasks = scheduledTasks.filter((t) => {
    const taskDate = new Date(t.scheduledTask!.startDateTime);
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    return taskDate >= dayAfterTomorrow && taskDate < nextWeek;
  });

  const sections: Section[] = [
    { title: 'Today', data: todayTasks },
    { title: 'Tomorrow', data: tomorrowTasks },
    { title: 'This Week', data: upcomingTasks },
  ].filter((s) => s.data.length > 0);

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const priorityColors: Record<number, string> = {
    1: '#ef4444',
    2: '#f59e0b',
    3: '#22c55e',
  };

  const renderTask = ({ item: task }: { item: Task }) => (
    <View style={styles.taskCard}>
      <View
        style={[
          styles.priorityIndicator,
          { backgroundColor: priorityColors[task.priority] },
        ]}
      />
      <View style={styles.taskContent}>
        <Text style={styles.taskTime}>
          {formatTime(task.scheduledTask!.startDateTime)}
        </Text>
        <Text style={styles.taskTitle}>{task.title}</Text>
        <Text style={styles.taskDuration}>
          {formatDuration(task.durationMinutes)}
        </Text>
      </View>
      {task.scheduledTask?.overflowedDeadline && (
        <View style={styles.overflowBadge}>
          <Text style={styles.overflowText}>Overdue</Text>
        </View>
      )}
    </View>
  );

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>{section.data.length} tasks</Text>
    </View>
  );

  if (sections.length === 0 && !loading) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No scheduled tasks</Text>
        <Text style={styles.emptyText}>
          Go to Tasks and tap "Smart Schedule" to schedule your tasks
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      sections={sections}
      renderItem={renderTask}
      renderSectionHeader={renderSectionHeader}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={refresh} />
      }
      stickySectionHeadersEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
    minHeight: 40,
  },
  taskContent: {
    flex: 1,
  },
  taskTime: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 2,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 2,
  },
  taskDuration: {
    fontSize: 13,
    color: '#64748b',
  },
  overflowBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  overflowText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#dc2626',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f8fafc',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
});

