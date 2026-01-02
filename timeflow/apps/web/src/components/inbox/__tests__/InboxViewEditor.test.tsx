/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InboxViewEditor } from '../InboxViewEditor';
import { DEFAULT_INBOX_VIEWS } from '../../../../../../packages/shared/src/types/email.js';

describe('InboxViewEditor', () => {
  it('disables editing for the All view', () => {
    render(
      <InboxViewEditor
        views={DEFAULT_INBOX_VIEWS}
        categories={[]}
        selectedViewId="all"
        onSelectView={() => {}}
        onChange={() => {}}
        onDeleteView={() => {}}
      />
    );

    expect(screen.getByLabelText(/view name/i).getAttribute('disabled')).toBe('');
  });
});
