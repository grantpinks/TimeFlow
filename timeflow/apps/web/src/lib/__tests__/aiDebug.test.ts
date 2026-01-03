/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { getAiDebugEnabled, setAiDebugEnabled } from '../aiDebug';

describe('aiDebug storage', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
      clear: () => {
        store.clear();
      },
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  });

  it('persists the debug flag in localStorage', () => {
    setAiDebugEnabled(true);
    expect(getAiDebugEnabled()).toBe(true);
    setAiDebugEnabled(false);
    expect(getAiDebugEnabled()).toBe(false);
  });
});
