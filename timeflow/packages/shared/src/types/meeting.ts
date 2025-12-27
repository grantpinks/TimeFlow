export interface SchedulingLink {
  id: string;
  userId: string;
  name: string;
  slug: string;
  isActive: boolean;
  durationsMinutes: number[];
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  maxBookingHorizonDays: number;
  dailyCap: number;
  calendarProvider: 'google' | 'apple';
  calendarId: string;
  googleMeetEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  schedulingLinkId: string;
  userId: string;
  inviteeName: string;
  inviteeEmail: string;
  notes?: string | null;
  startDateTime: string;
  endDateTime: string;
  status: 'scheduled' | 'rescheduled' | 'cancelled';
  googleEventId?: string | null;
  appleEventUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  durationMinutes: number;
}
