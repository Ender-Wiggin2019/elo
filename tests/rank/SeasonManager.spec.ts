import {expect} from 'chai';
import {
  getSeasonId,
  getSeasonNumber,
  getSeasonInfo,
  shouldResetSeason,
  softResetMu,
  softResetSigma,
  getSeasonPointsReward,
  SEASON_MU_RETENTION,
  SEASON_SIGMA_RETENTION,
  SEASON_POINTS_DEFAULT,
} from '../../src/common/rank/SeasonManager';
import {DEFAULT_MU, DEFAULT_SIGMA} from '../../src/common/rank/constants';

describe('SeasonManager', () => {
  describe('getSeasonNumber', () => {
    it('should return 1 for Jan-Feb', () => {
      expect(getSeasonNumber(new Date(2026, 0, 15))).to.eq(1); // Jan
      expect(getSeasonNumber(new Date(2026, 1, 28))).to.eq(1); // Feb
    });

    it('should return 2 for Mar-Apr', () => {
      expect(getSeasonNumber(new Date(2026, 2, 1))).to.eq(2); // Mar
      expect(getSeasonNumber(new Date(2026, 3, 30))).to.eq(2); // Apr
    });

    it('should return 6 for Nov-Dec', () => {
      expect(getSeasonNumber(new Date(2026, 10, 1))).to.eq(6); // Nov
      expect(getSeasonNumber(new Date(2026, 11, 31))).to.eq(6); // Dec
    });
  });

  describe('getSeasonId', () => {
    it('should return correct format', () => {
      expect(getSeasonId(new Date(2026, 0, 1))).to.eq('2026-S1');
      expect(getSeasonId(new Date(2026, 2, 15))).to.eq('2026-S2');
      expect(getSeasonId(new Date(2026, 11, 31))).to.eq('2026-S6');
    });

    it('should handle year boundaries', () => {
      expect(getSeasonId(new Date(2025, 11, 31))).to.eq('2025-S6');
      expect(getSeasonId(new Date(2026, 0, 1))).to.eq('2026-S1');
    });
  });

  describe('getSeasonInfo', () => {
    it('should return correct season info for S1', () => {
      const info = getSeasonInfo(new Date(2026, 0, 15));
      expect(info.seasonId).to.eq('2026-S1');
      expect(info.seasonName).to.eq('Season 1 (Jan-Feb 2026)');
      expect(info.startDate.getMonth()).to.eq(0); // Jan
      expect(info.endDate.getMonth()).to.eq(2); // Mar 1st (end of S1)
    });

    it('should return correct season info for S6', () => {
      const info = getSeasonInfo(new Date(2026, 10, 15));
      expect(info.seasonId).to.eq('2026-S6');
      expect(info.seasonName).to.eq('Season 6 (Nov-Dec 2026)');
    });
  });

  describe('shouldResetSeason', () => {
    it('should return false for undefined lastSeasonId', () => {
      expect(shouldResetSeason(undefined, new Date(2026, 0, 1))).to.eq(false);
    });

    it('should return false when season has not changed', () => {
      expect(shouldResetSeason('2026-S1', new Date(2026, 1, 15))).to.eq(false);
    });

    it('should return true when season has changed', () => {
      expect(shouldResetSeason('2026-S1', new Date(2026, 2, 1))).to.eq(true); // S1 -> S2
    });

    it('should return true across year boundary', () => {
      expect(shouldResetSeason('2025-S6', new Date(2026, 0, 1))).to.eq(true); // 2025-S6 -> 2026-S1
    });
  });

  describe('softResetMu', () => {
    it('should return weighted average towards default', () => {
      const oldMu = 30;
      const expected = DEFAULT_MU * (1 - SEASON_MU_RETENTION) + oldMu * SEASON_MU_RETENTION;
      expect(softResetMu(oldMu)).to.eq(expected);
    });

    it('should return DEFAULT_MU when oldMu equals DEFAULT_MU', () => {
      expect(softResetMu(DEFAULT_MU)).to.eq(DEFAULT_MU);
    });

    it('should move a high mu downward', () => {
      const highMu = 40;
      const result = softResetMu(highMu);
      expect(result).to.be.lessThan(highMu);
      expect(result).to.be.greaterThan(DEFAULT_MU);
    });

    it('should move a low mu upward', () => {
      const lowMu = 10;
      const result = softResetMu(lowMu);
      expect(result).to.be.greaterThan(lowMu);
      expect(result).to.be.lessThan(DEFAULT_MU);
    });
  });

  describe('softResetSigma', () => {
    it('should return weighted average towards default', () => {
      const oldSigma = 4;
      const expected = DEFAULT_SIGMA * (1 - SEASON_SIGMA_RETENTION) + oldSigma * SEASON_SIGMA_RETENTION;
      expect(softResetSigma(oldSigma)).to.eq(expected);
    });
  });

  describe('getSeasonPointsReward', () => {
    it('should return 100 for 1st place', () => {
      expect(getSeasonPointsReward(1)).to.eq(100);
    });

    it('should return 50 for 2nd place', () => {
      expect(getSeasonPointsReward(2)).to.eq(50);
    });

    it('should return 30 for 3rd place', () => {
      expect(getSeasonPointsReward(3)).to.eq(30);
    });

    it('should return default (15) for other positions', () => {
      expect(getSeasonPointsReward(4)).to.eq(SEASON_POINTS_DEFAULT);
      expect(getSeasonPointsReward(10)).to.eq(SEASON_POINTS_DEFAULT);
      expect(getSeasonPointsReward(100)).to.eq(SEASON_POINTS_DEFAULT);
    });
  });
});
