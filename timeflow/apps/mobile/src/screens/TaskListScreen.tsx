/**
 * Task List Screen
 *
 * Displays all tasks with filters and actions.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useTasks } from '../hooks/useTasks';
import type { Task } from '../lib/api';

type FilterType = 'all' | 'unscheduled' | 'scheduled' | 'completed';

const priorityColors: Record<number, string> = {
  1: '#ef4444', // red
  2: '#f59e0b', // yellow
  3: '#22c55e', // green
};

const priorityLabels: Record<number, string> = {
  1: 'High',
  2: 'Medium',
  3: 'Low',
};

export function TaskListScreen() {
  const { tasks, loading, error, refresh, completeTask, deleteTask } = useTasks();
  const [filter, setFilter] = useState<FilterType>('all');

  const filteredTasks = tasks.filter((task) => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const handleComplete = async (task: Task) => {
    try {
      await completeTask(task.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to complete task');
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert('Delete Task', `Are you sure you want to delete "${task.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTask(task.id);
          } catch (err) {
            Alert.alert('Error', 'Failed to delete task');
          }
        },
      },
    ]);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderTask = ({ item: task }: { item: Task }) => (
    <View style={[styles.taskCard, task.status === 'completed' && styles.completedTask]}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          task.status === 'completed' && styles.checkboxCompleted,
        ]}
        onPress={() => handleComplete(task)}
        disabled={task.status === 'completed'}
      >
        {task.status === 'completed' && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <View style={styles.taskContent}>
        <View style={styles.taskHeader}>
          <Text
            style={[
              styles.taskTitle,
              task.status === 'completed' && styles.completedText,
            ]}
            numberOfLines={1}
          >
            {task.title}
          </Text>
          <View
            style={[
              styles.priorityBadge,
              { backgroundColor: priorityColors[task.priority] + '20' },
            ]}
          >
            <Text
              style={[styles.priorityText, { color: priorityColors[task.priority] }]}
            >
              {priorityLabels[task.priority]}
            </Text>
          </View>
        </View>

        <View style={styles.taskMeta}>
          <Text style={styles.metaText}>{formatDuration(task.durationMinutes)}</Text>
          {task.dueDate && (
            <Text style={styles.metaText}>Due: {formatDate(task.dueDate)}</Text>
          )}
          {task.scheduledTask && (
            <Text style={styles.scheduledText}>
              {new Date(task.scheduledTask.startDateTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(task)}>
        <Text style={styles.deleteText}>×</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterContainer}>
        {(['all', 'unscheduled', 'scheduled', 'completed'] as FilterType[]).map(
          (f) => (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, filter === f && styles.filterTabActive]}
              onPress={() => setFilter(f)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === f && styles.filterTextActive,
                ]}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Task list */}
      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {loading ? 'Loading...' : 'No tasks found'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContent: {
    padding: 16,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  completedTask: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#22c55e',
    borderColor: '#22c55e',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#94a3b8',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '600',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  scheduledText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
  },
  deleteText: {
    fontSize: 24,
    color: '#94a3b8',
    fontWeight: '300',
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 8,
  },
  errorText: {
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
});

