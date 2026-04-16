/**
 * Flow AI assistant — chat, schedule preview, Apply (parity with web /assistant).
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as api from '../lib/api';
import type { ChatMessage, SchedulePreview } from '../lib/api';
import { useTasks } from '../hooks/useTasks';
import { SchedulePreviewPanel } from '../components/SchedulePreviewPanel';
import { saveSchedulePreview, clearSchedulePreview } from '../lib/schedulePreviewStorage';
import { friendlyApplyError } from '../lib/friendlyApplyError';

const QUICK_PROMPTS = [
  'What does my schedule look like today?',
  'Schedule my high priority tasks',
  'When am I free this week?',
];

function generateSmartTitle(msgs: ChatMessage[]): string {
  if (msgs.length === 0) return `Chat - ${new Date().toLocaleDateString()}`;
  const firstUser = msgs.find((m) => m.role === 'user');
  if (!firstUser) return `Chat - ${new Date().toLocaleDateString()}`;
  let title = firstUser.content.trim();
  const firstSentence = title.match(/^[^.!?]+/);
  if (firstSentence) title = firstSentence[0];
  if (title.length > 40) title = `${title.substring(0, 40)}...`;
  return title;
}

/** Persist user + assistant turns to the server (parity with web assistant auto-save). */
async function persistAssistantExchange(
  priorMessages: ChatMessage[],
  userMessage: ChatMessage,
  assistantMessage: ChatMessage,
  cid: string | null,
  setCid: React.Dispatch<React.SetStateAction<string | null>>
): Promise<void> {
  try {
    if (cid) {
      await api.addMessagesToConversation(cid, [userMessage, assistantMessage]);
      return;
    }
    const all = [...priorMessages, userMessage, assistantMessage];
    const title = generateSmartTitle(all);
    const conv = await api.createConversation({ title, messages: all });
    setCid(conv.id);
  } catch (e) {
    console.warn('[Assistant] Failed to persist conversation', e);
  }
}

async function persistAssistantMessagesOnly(
  msgs: ChatMessage[],
  cid: string | null
): Promise<void> {
  if (!cid || msgs.length === 0) return;
  try {
    await api.addMessagesToConversation(cid, msgs);
  } catch (e) {
    console.warn('[Assistant] Failed to persist messages', e);
  }
}

export function AssistantScreen() {
  const { tasks, refresh: refreshTasks } = useTasks();
  const [habits, setHabits] = useState<api.Habit[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [schedulePreview, setSchedulePreview] = useState<SchedulePreview | null>(null);
  const [previewApplied, setPreviewApplied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ messages: history, conversationId: cid }, habitList] = await Promise.all([
          api.getAssistantHistory(),
          api.getHabits().catch(() => [] as api.Habit[]),
        ]);
        if (!cancelled) {
          if (history.length > 0) setMessages(history);
          setConversationId(cid);
          setHabits(habitList);
        }
      } catch (e) {
        console.warn('[Assistant] history or habits load failed', e);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const priorMessages = messages;

    const userMessage: ChatMessage = {
      id: `m_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setApplyError(null);

    try {
      const historyForApi = [...priorMessages, userMessage];
      const res = await api.sendChatMessage(trimmed, historyForApi, conversationId ?? undefined);

      setMessages((prev) => [...prev, res.message]);
      await persistAssistantExchange(
        priorMessages,
        userMessage,
        res.message,
        conversationId,
        setConversationId
      );

      if (res.suggestions) {
        setSchedulePreview(res.suggestions);
        setPreviewApplied(false);
        await saveSchedulePreview(res.suggestions);
      }
    } catch (err) {
      const e = err as Error & { code?: string; status?: number; creditsRemaining?: number };
      let text = e.message || 'Something went wrong.';
      if (e.status === 402 || e.code === 'INSUFFICIENT_CREDITS') {
        text =
          'You are out of Flow Credits for this action. Upgrade your plan or try again tomorrow.';
      }
      const errorMessage: ChatMessage = {
        id: `m_err_${Date.now()}`,
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      await persistAssistantExchange(
        priorMessages,
        userMessage,
        errorMessage,
        conversationId,
        setConversationId
      );
    } finally {
      setLoading(false);
    }
  };

  const handleApplySchedule = useCallback(async () => {
    if (!schedulePreview) return;
    setApplying(true);
    setApplyError(null);
    try {
      const applyBlocks: api.ApplyScheduleBlock[] = [];
      schedulePreview.blocks.forEach((block) => {
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
      const result = await api.applySchedule(applyBlocks);
      await refreshTasks();
      setSchedulePreview(null);
      setPreviewApplied(true);
      await clearSchedulePreview();

      const t = result.tasksScheduled ?? 0;
      const h = result.habitsScheduled ?? 0;
      let successText = 'Schedule applied!';
      if (t > 0 && h > 0) {
        successText = `Schedule applied! ${t} task(s) and ${h} habit instance(s) added to your calendar.`;
      } else if (t > 0) {
        successText = `Schedule applied! ${t} task(s) added to your calendar.`;
      } else if (h > 0) {
        successText = `Schedule applied! ${h} habit instance(s) added to your calendar.`;
      }

      const successMessage: ChatMessage = {
        id: `m_ok_${Date.now()}`,
        role: 'assistant',
        content: successText,
        timestamp: new Date().toISOString(),
        metadata: { mascotState: 'celebrating' },
      };
      setMessages((prev) => [...prev, successMessage]);
      await persistAssistantMessagesOnly([successMessage], conversationId);
    } catch (error) {
      const raw = error instanceof Error ? error.message : '';
      const friendly = friendlyApplyError(raw);
      setApplyError(friendly);
      const errorMessage: ChatMessage = {
        id: `m_apply_err_${Date.now()}`,
        role: 'assistant',
        content: friendly,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      await persistAssistantMessagesOnly([errorMessage], conversationId);
    } finally {
      setApplying(false);
    }
  }, [schedulePreview, refreshTasks, conversationId]);

  const handleCancelPreview = useCallback(async () => {
    setSchedulePreview(null);
    setPreviewApplied(false);
    setApplyError(null);
    await clearSchedulePreview();
  }, []);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>{item.content}</Text>
        </View>
      </View>
    );
  };

  if (historyLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#0BAF9A" />
        <Text style={styles.hint}>Loading conversation…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          style={styles.flex}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.hero}>
              <Text style={styles.heroTitle}>Flow</Text>
              <Text style={styles.heroSub}>Ask about your schedule, tasks, or habits.</Text>
              <View style={styles.quickRow}>
                {QUICK_PROMPTS.map((q) => (
                  <Pressable key={q} style={styles.quickChip} onPress={() => setInput(q)}>
                    <Text style={styles.quickChipText}>{q}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          }
          ListFooterComponent={
            <>
              {loading ? (
                <View style={styles.thinking}>
                  <ActivityIndicator color="#0BAF9A" />
                  <Text style={styles.thinkingText}>Flow is thinking…</Text>
                </View>
              ) : null}
              {schedulePreview ? (
                <SchedulePreviewPanel
                  preview={schedulePreview}
                  tasks={tasks}
                  habits={habits}
                  onApply={handleApplySchedule}
                  onCancel={handleCancelPreview}
                  applying={applying}
                  applied={previewApplied}
                />
              ) : null}
              {applyError ? (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorText}>{applyError}</Text>
                </View>
              ) : null}
            </>
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Message Flow…"
            placeholderTextColor="#94a3b8"
            editable={!loading}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={loading || !input.trim()}
            style={({ pressed }) => [
              styles.sendBtn,
              (loading || !input.trim()) && styles.sendBtnDisabled,
              pressed && styles.sendBtnPressed,
            ]}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  hint: { marginTop: 12, color: '#64748b', fontSize: 14 },
  listContent: { padding: 16, paddingBottom: 8 },
  hero: { paddingVertical: 24 },
  heroTitle: { fontSize: 28, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  heroSub: { fontSize: 16, color: '#64748b', marginBottom: 20 },
  quickRow: { gap: 10 },
  quickChip: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    marginBottom: 8,
  },
  quickChipText: { fontSize: 14, color: '#334155' },
  bubbleRow: { flexDirection: 'row', marginBottom: 12, justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '88%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleUser: { backgroundColor: '#0BAF9A' },
  bubbleAssistant: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0' },
  bubbleText: { fontSize: 15, lineHeight: 22, color: '#0f172a' },
  bubbleTextUser: { color: '#fff' },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  thinkingText: { color: '#64748b', fontSize: 14 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    backgroundColor: '#fff',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#0f172a',
  },
  sendBtn: {
    backgroundColor: '#0BAF9A',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendBtnDisabled: { opacity: 0.45 },
  sendBtnPressed: { opacity: 0.85 },
  sendBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  errorBanner: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#b91c1c', fontSize: 14, lineHeight: 20 },
});
