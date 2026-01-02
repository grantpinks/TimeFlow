/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_INBOX_VIEWS } from '../../../../../packages/shared/src/types/email.js';
import { loadInboxViews, saveInboxViews } from '../inboxViewsStorage';

describe('inboxViewsStorage', () => {
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

  it('falls back to defaults when storage is empty', () => {
    localStorage.clear();
    expect(loadInboxViews()).toEqual(DEFAULT_INBOX_VIEWS);
  });

  it('persists and reloads views', () => {
    const custom = [{ ...DEFAULT_INBOX_VIEWS[0], id: 'custom', name: 'Custom', labelIds: ['social'] }];
    saveInboxViews(custom);
    expect(loadInboxViews()).toEqual(custom);
  });
});
