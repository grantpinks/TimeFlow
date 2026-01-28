/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AiPreferencesPanel } from '../AiPreferencesPanel';

describe('AiPreferencesPanel', () => {
  it('renders AI preference sections', () => {
    const mockOnSave = vi.fn();
    
    render(
      <AiPreferencesPanel
        wakeTime="08:00"
        sleepTime="23:00"
        meetingStartTime="09:00"
        meetingEndTime="17:00"
        useMeetingHours={true}
        onSave={mockOnSave}
      />
    );

    // Check for key sections using getAllByText for duplicates
    expect(screen.getAllByText(/working hours/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/meeting preferences/i)).not.toBeNull();
    expect(screen.getByText(/AI Assistant Preferences/i)).not.toBeNull();
  });

  it('displays current preferences', () => {
    const mockOnSave = vi.fn();
    
    render(
      <AiPreferencesPanel
        wakeTime="08:00"
        sleepTime="23:00"
        meetingStartTime="09:00"
        meetingEndTime="17:00"
        useMeetingHours={true}
        onSave={mockOnSave}
      />
    );

    // Check wake time is displayed
    const wakeTimeInput = screen.getByLabelText(/wake time/i) as HTMLInputElement;
    expect(wakeTimeInput.value).toBe('08:00');

    // Check sleep time is displayed
    const sleepTimeInput = screen.getByLabelText(/sleep time/i) as HTMLInputElement;
    expect(sleepTimeInput.value).toBe('23:00');
  });

  it('allows editing preferences', () => {
    const mockOnSave = vi.fn();
    
    render(
      <AiPreferencesPanel
        wakeTime="08:00"
        sleepTime="23:00"
        meetingStartTime="09:00"
        meetingEndTime="17:00"
        useMeetingHours={true}
        onSave={mockOnSave}
      />
    );

    // Change wake time
    const wakeTimeInput = screen.getByLabelText(/wake time/i) as HTMLInputElement;
    fireEvent.change(wakeTimeInput, { target: { value: '07:00' } });

    expect(wakeTimeInput.value).toBe('07:00');
  });

  it('calls onSave with updated preferences', async () => {
    const mockOnSave = vi.fn();
    
    const { container } = render(
      <AiPreferencesPanel
        wakeTime="08:00"
        sleepTime="23:00"
        meetingStartTime="09:00"
        meetingEndTime="17:00"
        useMeetingHours={true}
        onSave={mockOnSave}
      />
    );

    // Find the specific wake time input by ID
    const wakeTimeInput = container.querySelector('#wake-time') as HTMLInputElement;
    expect(wakeTimeInput).not.toBeNull();
    expect(wakeTimeInput.value).toBe('08:00');

    // Change the value
    fireEvent.change(wakeTimeInput, { target: { value: '07:00' } });

    // Wait for the input value to update
    await waitFor(() => {
      expect(wakeTimeInput.value).toBe('07:00');
    });

    // Find all buttons and get the one that contains "Save Preferences"
    const buttons = container.querySelectorAll('button');
    const saveButton = Array.from(buttons).find(btn => btn.textContent?.includes('Save Preferences'));
    
    expect(saveButton).not.toBeNull();
    fireEvent.click(saveButton!);

    expect(mockOnSave).toHaveBeenCalledWith({
      wakeTime: '07:00',
      sleepTime: '23:00',
      meetingStartTime: '09:00',
      meetingEndTime: '17:00',
      useMeetingHours: true,
    });
  });
});
