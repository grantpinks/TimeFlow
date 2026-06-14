import { describe, expect, it, vi, beforeEach } from 'vitest';
import { deleteAccount } from '../accountController.js';
import { deleteUserAccount } from '../../services/accountDeletionService.js';
import {
  createControllerReply,
  createControllerRequest,
} from './helpers/typedFastifyMocks.js';

vi.mock('../../services/accountDeletionService.js', () => ({
  deleteUserAccount: vi.fn(),
}));

describe('accountController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    const request = createControllerRequest({ user: undefined });
    const reply = createControllerReply();

    await deleteAccount(request, reply);

    expect(reply.statusCode).toBe(401);
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it('deletes account, clears cookies, and returns success', async () => {
    vi.mocked(deleteUserAccount).mockResolvedValue(undefined);

    const request = createControllerRequest({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const reply = createControllerReply();

    const result = await deleteAccount(request, reply);

    expect(deleteUserAccount).toHaveBeenCalledWith('user-1', expect.anything());
    expect(reply.clearCookie).toHaveBeenCalledTimes(2);
    expect(result).toEqual({ success: true });
  });

  it('returns 500 when deletion fails', async () => {
    vi.mocked(deleteUserAccount).mockRejectedValue(new Error('db error'));

    const request = createControllerRequest({
      user: { id: 'user-1', email: 'test@example.com' },
    });
    const reply = createControllerReply();

    await deleteAccount(request, reply);

    expect(reply.statusCode).toBe(500);
  });
});
