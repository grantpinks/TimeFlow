/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InboxAiDraftPanel } from '../InboxAiDraftPanel';

describe('InboxAiDraftPanel', () => {
  it('renders the CTA for task drafts', () => {
    render(
      <InboxAiDraftPanel
        isOpen
        draft={{
          type: 'task',
          draft: {
            title: 'Follow up',
            description: 'Reply to the email',
            priority: 2,
            dueDate: null,
          },
          confirmCta: 'Want me to create this task?',
        }}
        onClose={() => {}}
        onConfirm={() => {}}
      />
    );

    expect(screen.getByText('Want me to create this task?')).not.toBeNull();
  });
});
