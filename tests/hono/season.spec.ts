import {expect} from 'chai';
import {app} from '../../src/server/hono/app';
import {Database} from '../../src/server/database/Database';
import {GameLoader} from '../../src/server/database/GameLoader';
import {getSeasonId, getSeasonInfo} from '../../src/common/rank/SeasonManager';
import {User} from '../../src/server/User';

describe('Hono Season Routes', () => {
  describe('GET /api/v2/season/info', () => {
    it('should return current season info', async () => {
      const res = await app.request('/api/v2/season/info');
      expect(res.status).to.eq(200);

      const data = await res.json();
      const now = new Date();
      const expectedId = getSeasonId(now);
      const expectedInfo = getSeasonInfo(now);

      expect(data.seasonId).to.eq(expectedId);
      expect(data.seasonName).to.eq(expectedInfo.seasonName);
      expect(data.startDate).to.be.a('string');
      expect(data.endDate).to.be.a('string');
    });

    it('should return season with correct ID format', async () => {
      const res = await app.request('/api/v2/season/info');
      const data = await res.json();

      // 格式: "2026-S1"
      expect(data.seasonId).to.match(/^\d{4}-S[1-6]$/);
    });
  });

  describe('GET /api/v2/season/history', () => {
    it('should return 400 without seasonId', async () => {
      const res = await app.request('/api/v2/season/history');
      expect(res.status).to.eq(400);

      const data = await res.json();
      expect(data.error).to.include('Missing seasonId');
    });

    it('should return empty snapshots for non-existent season', async () => {
      // FAKE_DATABASE.getSeasonSnapshots returns []
      const res = await app.request('/api/v2/season/history?seasonId=2099-S1');
      expect(res.status).to.eq(200);

      const data = await res.json();
      expect(data.seasonId).to.eq('2099-S1');
      expect(data.snapshots).to.deep.eq([]);
    });

    it('should return snapshot data with user names', async () => {
      // 准备测试数据
      const testUser = new User('TestPlayer', '', 'test-user-1');
      GameLoader.getInstance().userIdMap.set('test-user-1', testUser);

      const originalGetSnapshots = Database.getInstance().getSeasonSnapshots;
      Database.getInstance().getSeasonSnapshots = () => Promise.resolve([
        {userId: 'test-user-1', rankValue: 5000, mu: 30, sigma: 6, trueskill: 12, pointsEarned: 100, finalPosition: 1},
      ]);

      try {
        const res = await app.request('/api/v2/season/history?seasonId=2026-S1');
        expect(res.status).to.eq(200);

        const data = await res.json();
        expect(data.snapshots).to.have.length(1);
        expect(data.snapshots[0].userName).to.eq('TestPlayer');
        expect(data.snapshots[0].pointsEarned).to.eq(100);
        expect(data.snapshots[0].finalPosition).to.eq(1);
      } finally {
        Database.getInstance().getSeasonSnapshots = originalGetSnapshots;
        GameLoader.getInstance().userIdMap.delete('test-user-1');
      }
    });
  });
});
