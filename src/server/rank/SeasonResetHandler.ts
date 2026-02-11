// 赛季重置处理器
// 在服务器启动时检查是否需要重置赛季，并在需要时执行重置

import {Database} from '../database/Database';
import {GameLoader} from '../database/GameLoader';
import {UserRank} from '../../common/rank/RankManager';
import {DEFAULT_RANK_VALUE} from '../../common/rank/constants';
import {RankTiers} from '../../common/rank/RankTiers';
import {
  getSeasonId,
  getSeasonInfo,
  getSeasonPointsReward,
  getPreviousSeasonId,
  shouldResetSeason,
  softResetMu,
  softResetSigma,
} from '../../common/rank/SeasonManager';

export interface ISeasonResetOptions {
  expectedFromSeasonId?: string;
  dryRun?: boolean;
  triggeredBy?: 'auto' | 'admin';
}

export interface ISeasonResetPlayerPreview {
  userId: string;
  position: number;
  oldRankValue: number;
  newRankValue: number;
  oldMu: number;
  newMu: number;
  oldSigma: number;
  newSigma: number;
  pointsEarned: number;
}

export interface ISeasonResetResult {
  status: 'skipped' | 'dry-run' | 'completed';
  reason?: string;
  fromSeasonId: string;
  toSeasonId: string;
  playerCount: number;
  preview: Array<ISeasonResetPlayerPreview>;
  triggeredBy: 'auto' | 'admin';
}

let isSeasonResetRunning = false;

/**
 * 检查并执行赛季重置
 * 在服务器启动时调用，也可以定期调用
 */
export async function checkAndResetSeason(): Promise<void> {
  const now = new Date();
  const currentSeasonId = getSeasonId(now);
  const seasonInfo = getSeasonInfo(now);
  const gameLoader = GameLoader.getInstance();
  const userRankMap = gameLoader.userRankMap;

  // 检查是否有任何用户的 seasonId 需要更新（即赛季已经变化）
  let needsReset = false;
  let previousSeasonId: string | undefined;

  for (const [, userRank] of userRankMap) {
    if (userRank.seasonId && userRank.seasonId !== currentSeasonId) {
      needsReset = true;
      previousSeasonId = userRank.seasonId;
      break;
    }
  }

  // 如果没有用户有 seasonId，说明是首次启用赛季系统，为所有用户设置当前赛季
  if (!needsReset) {
    let hasAnySeasonId = false;
    for (const [, userRank] of userRankMap) {
      if (userRank.seasonId && userRank.seasonId.length > 0) {
        hasAnySeasonId = true;
        break;
      }
    }
    if (!hasAnySeasonId && userRankMap.size > 0) {
      console.log(`[Season] First-time season setup. Setting all users to season ${currentSeasonId}`);
      for (const [, userRank] of userRankMap) {
        userRank.seasonId = currentSeasonId;
        await Database.getInstance().updateUserRank(userRank);
      }
      return;
    }
    console.log(`[Season] Current season: ${currentSeasonId} (${seasonInfo.seasonName}). No reset needed.`);
    return;
  }

  if (!shouldResetSeason(previousSeasonId, now)) {
    console.log(`[Season] No season reset needed. Current: ${currentSeasonId}, Previous: ${previousSeasonId}`);
    return;
  }

  const result = await runSeasonReset({
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expectedFromSeasonId: previousSeasonId!,
    dryRun: false,
    triggeredBy: 'auto',
  });
  console.log('[Season] Auto season reset result:', result.status, result.reason || '');
}

/**
 * 手动执行赛季重置（支持 dry-run）
 */
export async function runSeasonReset(options: ISeasonResetOptions = {}): Promise<ISeasonResetResult> {
  if (isSeasonResetRunning) {
    throw new Error('Season reset is already running');
  }
  isSeasonResetRunning = true;
  try {
    const now = new Date();
    const currentSeasonId = getSeasonId(now);
    const previousSeasonId = options.expectedFromSeasonId || getPreviousSeasonId(currentSeasonId);
    const dryRun = options.dryRun === true;
    const triggeredBy = options.triggeredBy || 'admin';
    return await performSeasonReset(previousSeasonId, currentSeasonId, dryRun, triggeredBy);
  } finally {
    isSeasonResetRunning = false;
  }
}

/**
 * 执行赛季重置
 * 1. 对所有用户按排名排序
 * 2. 保存赛季快照
 * 3. 发放积分
 * 4. 软重置分数
 */
async function performSeasonReset(
  previousSeasonId: string,
  newSeasonId: string,
  dryRun: boolean,
  triggeredBy: 'auto' | 'admin',
): Promise<ISeasonResetResult> {
  const gameLoader = GameLoader.getInstance();
  const db = Database.getInstance();

  // 1. 获取所有用户排名，按 rankValue 降序、trueskill 降序排序
  const allRanks: Array<UserRank> = [];
  for (const [, userRank] of gameLoader.userRankMap) {
    allRanks.push(userRank);
  }
  allRanks.sort((a, b) => {
    if (b.rankValue !== a.rankValue) return b.rankValue - a.rankValue;
    return b.trueskill - a.trueskill;
  });

  const seasonInfo = getSeasonInfo(nowFromSeasonId(newSeasonId));
  console.log(`[Season] Season reset triggered! Previous: ${previousSeasonId} -> Current: ${newSeasonId}`);
  console.log(`[Season] ${seasonInfo.seasonName}, triggeredBy=${triggeredBy}, dryRun=${dryRun}`);
  console.log(`[Season] Processing ${allRanks.length} players for season reset`);

  const mismatchedPlayers = allRanks.filter((rank) => rank.seasonId && rank.seasonId !== previousSeasonId).length;
  if (mismatchedPlayers > 0) {
    return {
      status: 'skipped',
      reason: `Found ${mismatchedPlayers} users not in expected season ${previousSeasonId}`,
      fromSeasonId: previousSeasonId,
      toSeasonId: newSeasonId,
      playerCount: allRanks.length,
      preview: buildResetPreview(allRanks, 20),
      triggeredBy,
    };
  }

  const preview = buildResetPreview(allRanks, 20);
  if (dryRun) {
    return {
      status: 'dry-run',
      fromSeasonId: previousSeasonId,
      toSeasonId: newSeasonId,
      playerCount: allRanks.length,
      preview,
      triggeredBy,
    };
  }

  // 2 & 3. 保存快照并发放积分
  for (let i = 0; i < allRanks.length; i++) {
    const userRank = allRanks[i];
    const position = i + 1; // 1-indexed
    const pointsEarned = getSeasonPointsReward(position);

    // 保存赛季快照
    await db.saveSeasonSnapshot(
      userRank.userId,
      previousSeasonId,
      userRank.rankValue,
      userRank.mu,
      userRank.sigma,
      userRank.trueskill,
      pointsEarned,
      position,
    );

    // 累加积分
    userRank.points = (userRank.points || 0) + pointsEarned;

    console.log(`[Season] Player ${userRank.userId}: position=${position}, points_earned=${pointsEarned}, total_points=${userRank.points}`);

    // 4. 软重置排名
    userRank.rankValue = computeSeasonResetRankValue(userRank);
    // TrueSkill 保留一部分
    userRank.mu = softResetMu(userRank.mu);
    userRank.sigma = softResetSigma(userRank.sigma);
    userRank.trueskill = userRank.mu - 3 * userRank.sigma;
    // 更新赛季ID
    userRank.seasonId = newSeasonId;

    // 保存到数据库
    await db.updateUserRank(userRank);
    await db.updateUserPoints(userRank.userId, userRank.points);

    // 更新内存缓存
    gameLoader.addOrUpdateUserRank(userRank);
  }

  console.log(`[Season] Season reset complete. ${allRanks.length} players processed.`);
  return {
    status: 'completed',
    fromSeasonId: previousSeasonId,
    toSeasonId: newSeasonId,
    playerCount: allRanks.length,
    preview,
    triggeredBy,
  };
}

function buildResetPreview(allRanks: Array<UserRank>, limit: number): Array<ISeasonResetPlayerPreview> {
  return allRanks.slice(0, limit).map((rank, index) => {
    const newRankValue = computeSeasonResetRankValue(rank);
    const newMu = softResetMu(rank.mu);
    const newSigma = softResetSigma(rank.sigma);
    return {
      userId: rank.userId,
      position: index + 1,
      oldRankValue: rank.rankValue,
      newRankValue,
      oldMu: rank.mu,
      newMu,
      oldSigma: rank.sigma,
      newSigma,
      pointsEarned: getSeasonPointsReward(index + 1),
    };
  });
}

function computeSeasonResetRankValue(userRank: UserRank): number {
  const tierName = userRank.getTier().name;
  const tierIndex = RankTiers.findIndex((tier) => tier.name === tierName);
  if (tierIndex <= 0) {
    return DEFAULT_RANK_VALUE;
  }
  return DEFAULT_RANK_VALUE + tierIndex;
}

function nowFromSeasonId(seasonId: string): Date {
  const match = seasonId.match(/^(\d{4})-S([1-6])$/);
  if (match === null) {
    return new Date();
  }
  const year = Number(match[1]);
  const seasonNumber = Number(match[2]);
  const month = (seasonNumber - 1) * 2;
  return new Date(year, month, 1, 0, 0, 0);
}
