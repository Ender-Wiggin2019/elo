import {expect} from 'chai';
import {app} from '../../src/server/hono/app';
import {Database} from '../../src/server/database/Database';
import {GameLoader} from '../../src/server/database/GameLoader';
import {UserRank} from '../../src/common/rank/RankManager';
import {User} from '../../src/server/User';

describe('Hono Matchmaking Routes', () => {
  // 使用12字符以内的ID，避免GameLoader的自定义get截断问题
  const testUserId = 'matchtester1';
  const testUserRank = new UserRank(testUserId, 3000, 25, 8.333, 0, 0, '2026-S1');
  const testUser = new User('MatchTestPlayer', '', testUserId);

  beforeEach(() => {
    GameLoader.getInstance().userRankMap.set(testUserId, testUserRank);
    GameLoader.getInstance().userIdMap.set(testUserId, testUser);
  });

  afterEach(() => {
    GameLoader.getInstance().userRankMap.delete(testUserId);
    GameLoader.getInstance().userIdMap.delete(testUserId);
  });

  describe('POST /api/v2/matchmaking/join', () => {
    it('should return 400 without userId', async () => {
      const res = await app.request('/api/v2/matchmaking/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      });
      expect(res.status).to.eq(400);

      const data = await res.json();
      expect(data.error).to.include('Missing userId');
    });

    it('should return 404 for user without rank', async () => {
      const res = await app.request('/api/v2/matchmaking/join', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({userId: 'nonexistent-user'}),
      });
      expect(res.status).to.eq(404);

      const data = await res.json();
      expect(data.error).to.include('no rank');
    });

    it('should successfully queue a user with rank', async () => {
      let addedToQueue = false;
      const originalAdd = Database.getInstance().addToMatchmakingQueue;
      Database.getInstance().addToMatchmakingQueue = (_userId: string, _trueskill: number, _gameOptions: string) => {
        addedToQueue = true;
        return Promise.resolve();
      };

      // 确保 getMatchmakingQueue 返回只有一个用户（不够匹配）
      const originalGetQueue = Database.getInstance().getMatchmakingQueue;
      Database.getInstance().getMatchmakingQueue = () => Promise.resolve([
        {userId: testUserId, trueskill: 0, joinTime: new Date().toISOString(), gameOptions: '{}'},
      ]);

      try {
        const res = await app.request('/api/v2/matchmaking/join', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId: testUserId, gameOptions: {}}),
        });
        expect(res.status).to.eq(200);

        const data = await res.json();
        expect(data.status).to.eq('queued');
        expect(addedToQueue).to.eq(true);
      } finally {
        Database.getInstance().addToMatchmakingQueue = originalAdd;
        Database.getInstance().getMatchmakingQueue = originalGetQueue;
      }
    });
  });

  describe('POST /api/v2/matchmaking/leave', () => {
    it('should return 400 without userId', async () => {
      const res = await app.request('/api/v2/matchmaking/leave', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      });
      expect(res.status).to.eq(400);
    });

    it('should successfully remove user from queue', async () => {
      let removedUserId = '';
      const originalRemove = Database.getInstance().removeFromMatchmakingQueue;
      Database.getInstance().removeFromMatchmakingQueue = (userId: string) => {
        removedUserId = userId;
        return Promise.resolve();
      };

      try {
        const res = await app.request('/api/v2/matchmaking/leave', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({userId: testUserId}),
        });
        expect(res.status).to.eq(200);

        const data = await res.json();
        expect(data.status).to.eq('left');
        expect(removedUserId).to.eq(testUserId);
      } finally {
        Database.getInstance().removeFromMatchmakingQueue = originalRemove;
      }
    });
  });

  describe('GET /api/v2/matchmaking/poll', () => {
    it('should return 400 without userId', async () => {
      const res = await app.request('/api/v2/matchmaking/poll');
      expect(res.status).to.eq(400);

      const data = await res.json();
      expect(data.error).to.include('Missing userId');
    });

    it('should return queue status when user is in queue', async () => {
      const originalGetQueue = Database.getInstance().getMatchmakingQueue;
      Database.getInstance().getMatchmakingQueue = () => Promise.resolve([
        {userId: testUserId, trueskill: 0, joinTime: new Date().toISOString(), gameOptions: '{}'},
        {userId: 'other-user', trueskill: 100, joinTime: new Date().toISOString(), gameOptions: '{}'},
      ]);

      try {
        const res = await app.request('/api/v2/matchmaking/poll?userId=' + testUserId);
        expect(res.status).to.eq(200);

        const data = await res.json();
        expect(data.inQueue).to.eq(true);
        expect(data.queueSize).to.eq(2);
      } finally {
        Database.getInstance().getMatchmakingQueue = originalGetQueue;
      }
    });

    it('should return not-in-queue when user is not in queue', async () => {
      const originalGetQueue = Database.getInstance().getMatchmakingQueue;
      Database.getInstance().getMatchmakingQueue = () => Promise.resolve([]);

      try {
        const res = await app.request('/api/v2/matchmaking/poll?userId=' + testUserId);
        expect(res.status).to.eq(200);

        const data = await res.json();
        expect(data.inQueue).to.eq(false);
        expect(data.queueSize).to.eq(0);
      } finally {
        Database.getInstance().getMatchmakingQueue = originalGetQueue;
      }
    });
  });
});
