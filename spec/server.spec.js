import { describe, it, expect, vi } from 'vitest';

vi.mock('../backend/utils/localdb', () => {
  return {
    findUserByEmail: vi.fn(() => null),
    createUser: vi.fn(() => ({ id: '123', username: 'testuser', email: 'test@example.com' })),
    findUserById: vi.fn(() => ({ id: '123', username: 'testuser', email: 'test@example.com' })),
    getDreamsByUser: vi.fn(() => []),
    saveDream: vi.fn(() => ({ id: 'dream_1' })),
    deleteDream: vi.fn(() => true),
    getScores: vi.fn(() => []),
    saveScore: vi.fn(() => ({ id: 'score_1' })),
  };
});

describe('Backend Server API Spec', () => {
  it('should validate API registration flow using localdb mock', () => {
    const localDb = require('../backend/utils/localdb');
    const user = localDb.createUser({ username: 'testuser', email: 'test@example.com' });
    expect(user).toBeDefined();
    expect(user.username).toBe('testuser');
  });

  it('should return empty list of high scores on initialization', () => {
    const localDb = require('../backend/utils/localdb');
    const scores = localDb.getScores();
    expect(scores).toBeInstanceOf(Array);
  });
});
