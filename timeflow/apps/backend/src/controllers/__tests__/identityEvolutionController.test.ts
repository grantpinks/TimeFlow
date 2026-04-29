import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getEvolutionState,
  getFlowCustomization,
  updateFlowCustomization,
  getIdentityUnlocks,
} from '../identityController.js';
import * as identityEvolutionService from '../../services/identityEvolutionService.js';
import { prisma } from '../../config/prisma.js';
import {
  createControllerReply,
  createControllerRequest,
} from './helpers/typedFastifyMocks.js';

vi.mock('../../services/identityEvolutionService.js', () => ({
  getEvolutionState: vi.fn(),
}));

vi.mock('../../config/prisma.js', () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    identity: { findMany: vi.fn() },
    identityUnlock: { findMany: vi.fn() },
    userFlowCustomization: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock('../../config/identityUnlockCatalog.js', () => ({
  UNLOCK_CATALOG: [
    {
      unlockKey: 'flow_palette_ocean',
      unlockType: 'flow_palette',
      grantedByStage: null,
      grantedByLevel: 3,
      displayName: 'Ocean Breeze',
      description: 'Cool blues and seafoam greens.',
    },
    {
      unlockKey: 'mechanic_focus_assist',
      unlockType: 'mechanic',
      grantedByStage: 'Builder',
      grantedByLevel: null,
      displayName: 'Focus Assist',
      description: 'Enable focus mode timer on task sessions.',
    },
  ],
}));

const USER_ID = 'user-abc';
const IDENTITY_ID = 'identity-xyz';

function makeRequest(overrides: Record<string, any> = {}) {
  return createControllerRequest<any>({ user: { id: USER_ID }, ...overrides });
}

describe('identityEvolutionController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.identityUnlock.findMany).mockResolvedValue([
      {
        unlockKey: 'flow_palette_default',
        unlockType: 'flow_palette',
      },
      {
        unlockKey: 'flow_palette_ocean',
        unlockType: 'flow_palette',
      },
      {
        unlockKey: 'flow_emote_wave',
        unlockType: 'flow_emote',
      },
      {
        unlockKey: 'flow_anim_basic',
        unlockType: 'flow_animation_pack',
      },
      {
        unlockKey: 'flow_form_seed',
        unlockType: 'flow_stage_form',
      },
    ] as any);
  });

  // ---------------------------------------------------------------------------
  // GET /identities/evolution-state
  // ---------------------------------------------------------------------------

  describe('getEvolutionState', () => {
    it('returns 403 when identityEvolutionEnabled is false', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: false,
      } as any);

      const request = makeRequest();
      const reply = createControllerReply();

      await getEvolutionState(request, reply);

      expect(reply.statusCode).toBe(403);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Identity evolution not enabled for this account.',
      });
    });

    it('returns 403 when user is not found', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      const request = makeRequest();
      const reply = createControllerReply();

      await getEvolutionState(request, reply);

      expect(reply.statusCode).toBe(403);
    });

    it('returns array of IdentityEvolutionState when flag is enabled', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);
      vi.mocked(prisma.identity.findMany).mockResolvedValue([
        { id: IDENTITY_ID },
        { id: 'identity-2' },
      ] as any);

      const state1 = {
        identityId: IDENTITY_ID,
        level: 3,
        stage: 'Builder',
        xp: 250,
        xpToNextLevel: 200,
        trialState: 'Active',
        trialActiveDays: 2,
        trialTargetDays: 4,
        trialWindowDays: 7,
        trialCheckpointDays: 0,
        trialStartedAt: null,
        trialEndsAt: null,
        xpThisPeriod: 30,
        xpCapResetAt: null,
      };
      const state2 = { ...state1, identityId: 'identity-2', level: 1 };

      vi.mocked(identityEvolutionService.getEvolutionState)
        .mockResolvedValueOnce(state1 as any)
        .mockResolvedValueOnce(state2 as any);

      const request = makeRequest();
      const reply = createControllerReply();

      await getEvolutionState(request, reply);

      expect(identityEvolutionService.getEvolutionState).toHaveBeenCalledTimes(2);
      expect(identityEvolutionService.getEvolutionState).toHaveBeenCalledWith(USER_ID, IDENTITY_ID);
      expect(identityEvolutionService.getEvolutionState).toHaveBeenCalledWith(USER_ID, 'identity-2');
      expect(reply.send).toHaveBeenCalledWith([state1, state2]);
    });
  });

  // ---------------------------------------------------------------------------
  // POST /identities/flow-customization
  // ---------------------------------------------------------------------------

  describe('updateFlowCustomization', () => {
    it('returns 403 when feature flag is off', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: false,
      } as any);

      const request = makeRequest({ body: { selectedPalette: 'ocean' } });
      const reply = createControllerReply();

      await updateFlowCustomization(request as any, reply);

      expect(reply.statusCode).toBe(403);
    });

    it('upserts and returns updated customization', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);

      const upserted = {
        id: 'custom-1',
        userId: USER_ID,
        selectedStageVariant: 'default',
        selectedPalette: 'ocean',
        selectedEmote: 'default',
        selectedAnimationPack: 'default',
        updatedAt: new Date(),
      };
      vi.mocked(prisma.userFlowCustomization.upsert).mockResolvedValue(upserted as any);

      const request = makeRequest({ body: { selectedPalette: 'ocean' } });
      const reply = createControllerReply();

      await updateFlowCustomization(request as any, reply);

      expect(prisma.userFlowCustomization.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
          update: expect.objectContaining({ selectedPalette: 'ocean' }),
        })
      );
      expect(reply.send).toHaveBeenCalledWith(upserted);
    });

    it('returns 400 for invalid body (non-string field)', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);

      // selectedPalette must be a string; passing a number triggers zod error
      const request = makeRequest({ body: { selectedPalette: 123 } });
      const reply = createControllerReply();

      await updateFlowCustomization(request as any, reply);

      expect(reply.statusCode).toBe(400);
    });

    it('returns 403 when attempting to select a locked cosmetic slug', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);

      const request = makeRequest({ body: { selectedPalette: 'aurora' } });
      const reply = createControllerReply();

      await updateFlowCustomization(request as any, reply);

      expect(reply.statusCode).toBe(403);
      expect(reply.send).toHaveBeenCalledWith({
        error: 'Customization option "aurora" is not unlocked yet.',
      });
      expect(prisma.userFlowCustomization.upsert).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // GET /identities/flow-customization
  // ---------------------------------------------------------------------------

  describe('getFlowCustomization', () => {
    it('returns defaults immediately when identityEvolutionEnabled is false (no DB call to userFlowCustomization)', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: false,
      } as any);

      const request = makeRequest();
      const reply = createControllerReply();

      await getFlowCustomization(request, reply);

      expect(prisma.userFlowCustomization.findUnique).not.toHaveBeenCalled();
      expect(reply.send).toHaveBeenCalledWith({
        selectedStageVariant: 'default',
        selectedPalette: 'default',
        selectedEmote: 'default',
        selectedAnimationPack: 'default',
      });
    });

    it('returns defaults when flag is on but no record exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);
      vi.mocked(prisma.userFlowCustomization.findUnique).mockResolvedValue(null);

      const request = makeRequest();
      const reply = createControllerReply();

      await getFlowCustomization(request, reply);

      expect(reply.send).toHaveBeenCalledWith({
        selectedStageVariant: 'default',
        selectedPalette: 'default',
        selectedEmote: 'default',
        selectedAnimationPack: 'default',
      });
    });

    it('returns the existing customization record when flag is on and record exists', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);
      const existing = {
        id: 'custom-1',
        userId: USER_ID,
        selectedStageVariant: 'builder',
        selectedPalette: 'ocean',
        selectedEmote: 'celebrate',
        selectedAnimationPack: 'energetic',
        updatedAt: new Date().toISOString(),
      };
      vi.mocked(prisma.userFlowCustomization.findUnique).mockResolvedValue(existing as any);
      vi.mocked(prisma.identityUnlock.findMany).mockResolvedValue([
        { unlockKey: 'flow_palette_ocean', unlockType: 'flow_palette' },
        { unlockKey: 'flow_emote_celebrate', unlockType: 'flow_emote' },
        { unlockKey: 'flow_anim_energetic', unlockType: 'flow_animation_pack' },
        { unlockKey: 'flow_form_builder', unlockType: 'flow_stage_form' },
      ] as any);

      const request = makeRequest();
      const reply = createControllerReply();

      await getFlowCustomization(request, reply);

      expect(reply.send).toHaveBeenCalledWith(existing);
    });

    it('coerces stored cosmetic slugs to default when not unlocked', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);
      const stored = {
        id: 'custom-1',
        userId: USER_ID,
        selectedStageVariant: 'default',
        selectedPalette: 'aurora',
        selectedEmote: 'default',
        selectedAnimationPack: 'default',
        updatedAt: new Date().toISOString(),
      };
      vi.mocked(prisma.userFlowCustomization.findUnique).mockResolvedValue(stored as any);
      vi.mocked(prisma.identityUnlock.findMany).mockResolvedValue([
        { unlockKey: 'flow_palette_default', unlockType: 'flow_palette' },
      ] as any);

      const request = makeRequest();
      const reply = createControllerReply();

      await getFlowCustomization(request, reply);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          ...stored,
          selectedPalette: 'default',
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // GET /identities/:id/unlocks
  // ---------------------------------------------------------------------------

  describe('getIdentityUnlocks', () => {
    it('returns 403 when feature flag is off', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: false,
      } as any);

      const request = makeRequest({ params: { id: IDENTITY_ID } });
      const reply = createControllerReply();

      await getIdentityUnlocks(request as any, reply);

      expect(reply.statusCode).toBe(403);
    });

    it('returns unlock list with catalog display names', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);

      const grantedAt = new Date('2026-04-01T00:00:00Z');
      vi.mocked(prisma.identityUnlock.findMany).mockResolvedValue([
        {
          id: 'unlock-1',
          identityId: IDENTITY_ID,
          userId: USER_ID,
          unlockKey: 'flow_palette_ocean',
          unlockType: 'flow_palette',
          grantedAt,
          grantedByStage: null,
          grantedByLevel: 3,
        },
        {
          id: 'unlock-2',
          identityId: IDENTITY_ID,
          userId: USER_ID,
          unlockKey: 'mechanic_focus_assist',
          unlockType: 'mechanic',
          grantedAt,
          grantedByStage: 'Builder',
          grantedByLevel: null,
        },
      ] as any);

      const request = makeRequest({ params: { id: IDENTITY_ID } });
      const reply = createControllerReply();

      await getIdentityUnlocks(request as any, reply);

      expect(reply.send).toHaveBeenCalledWith({
        unlocks: [
          {
            unlockKey: 'flow_palette_ocean',
            unlockType: 'flow_palette',
            grantedAt: grantedAt.toISOString(),
            displayName: 'Ocean Breeze',
            description: 'Cool blues and seafoam greens.',
          },
          {
            unlockKey: 'mechanic_focus_assist',
            unlockType: 'mechanic',
            grantedAt: grantedAt.toISOString(),
            displayName: 'Focus Assist',
            description: 'Enable focus mode timer on task sessions.',
          },
        ],
      });
    });

    it('returns empty unlock list when identity has no unlocks', async () => {
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        identityEvolutionEnabled: true,
      } as any);
      vi.mocked(prisma.identityUnlock.findMany).mockResolvedValue([]);

      const request = makeRequest({ params: { id: IDENTITY_ID } });
      const reply = createControllerReply();

      await getIdentityUnlocks(request as any, reply);

      expect(reply.send).toHaveBeenCalledWith({ unlocks: [] });
    });
  });
});
