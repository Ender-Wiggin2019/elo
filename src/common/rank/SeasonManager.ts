// 赛季管理器
// 每2个月为一个赛季，在下一个月1号0点刷新
// S1: 1-2月, S2: 3-4月, S3: 5-6月, S4: 7-8月, S5: 9-10月, S6: 11-12月

import {DEFAULT_MU, DEFAULT_SIGMA} from './constants';

// 赛季积分奖励
export const SEASON_POINTS_REWARDS: Record<number, number> = {
  1: 100, // 第一名
  2: 50, // 第二名
  3: 30, // 第三名
};
export const SEASON_POINTS_DEFAULT = 15; // 其他玩家

// 赛季软重置参数：保留60%的旧分数
export const SEASON_MU_RETENTION = 0.6;
export const SEASON_SIGMA_RETENTION = 0.6;

export interface ISeasonInfo {
  seasonId: string; // 格式: "2026-S1"
  seasonName: string; // 格式: "Season 1 (Jan-Feb 2026)"
  startDate: Date;
  endDate: Date; // 赛季结束时间（下一个赛季开始时间）
}

/**
 * 根据日期获取赛季编号 (1-6)
 */
export function getSeasonNumber(date: Date): number {
  const month = date.getMonth() + 1; // 1-12
  return Math.ceil(month / 2); // 1-6
}

/**
 * 获取赛季ID，格式: "2026-S1"
 */
export function getSeasonId(date: Date = new Date()): string {
  const year = date.getFullYear();
  const seasonNum = getSeasonNumber(date);
  return `${year}-S${seasonNum}`;
}

/**
 * 获取赛季信息
 */
export function getSeasonInfo(date: Date = new Date()): ISeasonInfo {
  const year = date.getFullYear();
  const seasonNum = getSeasonNumber(date);
  const startMonth = (seasonNum - 1) * 2; // 0-indexed: 0,2,4,6,8,10
  const endMonth = startMonth + 2;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const startMonthName = monthNames[startMonth];
  const endMonthName = monthNames[startMonth + 1];

  let endYear = year;
  let endMonthActual = endMonth;
  if (endMonth > 11) {
    endYear = year + 1;
    endMonthActual = 0;
  }

  return {
    seasonId: `${year}-S${seasonNum}`,
    seasonName: `Season ${seasonNum} (${startMonthName}-${endMonthName} ${year})`,
    startDate: new Date(year, startMonth, 1, 0, 0, 0),
    endDate: new Date(endYear, endMonthActual, 1, 0, 0, 0),
  };
}

/**
 * 判断是否需要重置赛季
 * @param lastSeasonId 上一次记录的赛季ID
 * @param currentDate 当前日期
 */
export function shouldResetSeason(lastSeasonId: string | undefined, currentDate: Date = new Date()): boolean {
  if (lastSeasonId === undefined) return false; // 首次无需重置
  const currentSeasonId = getSeasonId(currentDate);
  return currentSeasonId !== lastSeasonId;
}

/**
 * 赛季软重置：计算新的mu和sigma
 * 参考LoL等游戏的赛季重置机制，保留一部分旧分数
 */
export function softResetMu(oldMu: number): number {
  return DEFAULT_MU * (1 - SEASON_MU_RETENTION) + oldMu * SEASON_MU_RETENTION;
}

export function softResetSigma(oldSigma: number): number {
  // sigma向默认值回归，增加不确定性
  return DEFAULT_SIGMA * (1 - SEASON_SIGMA_RETENTION) + oldSigma * SEASON_SIGMA_RETENTION;
}

/**
 * 根据赛季排名获取积分奖励
 */
export function getSeasonPointsReward(position: number): number {
  return SEASON_POINTS_REWARDS[position] ?? SEASON_POINTS_DEFAULT;
}
