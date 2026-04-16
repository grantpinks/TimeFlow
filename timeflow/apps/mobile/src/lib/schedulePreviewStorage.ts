/**
 * Persist AI schedule preview across tabs (parity with web sessionStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SchedulePreview } from './api';

const KEY = 'flow_schedule_preview';

export async function saveSchedulePreview(preview: SchedulePreview): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(preview));
}

export async function loadSchedulePreview(): Promise<SchedulePreview | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SchedulePreview;
  } catch {
    return null;
  }
}

export async function clearSchedulePreview(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
