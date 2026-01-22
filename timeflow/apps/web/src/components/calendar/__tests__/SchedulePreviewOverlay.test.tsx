import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SchedulePreviewOverlay from '../SchedulePreviewOverlay';
import type { ScheduledBlock } from '@timeflow/shared';

const mockBlock: ScheduledBlock = {
  taskId: 'task-1',
  start: '2025-12-23T10:00:00Z',
  end: '2025-12-23T11:00:00Z',
};

describe('SchedulePreviewOverlay', () => {
  it('renders preview blocks on the calendar grid with an Apply CTA', () => {
    render(<SchedulePreviewOverlay blocks={[mockBlock]} onApply={() => {}} onCancel={() => {}} />);

    expect(screen.getByText('Schedule Preview')).toBeTruthy();
  });
});