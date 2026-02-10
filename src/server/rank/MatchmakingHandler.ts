// 自动匹配处理器
// 基于 TrueSkill 隐藏分进行匹配，纯DB实现（无Redis）
// 匹配逻辑：
// 1. 玩家加入队列时记录 trueskill 和加入时间
// 2. 每次 poll/join 时尝试匹配
// 3. 匹配范围随等待时间扩大

import {Database} from '../database/Database';
import {GameLoader} from '../database/GameLoader';

// 匹配参数
const INITIAL_TRUESKILL_RANGE = 5; // 初始匹配范围（trueskill分差）
const RANGE_EXPANSION_PER_MINUTE = 3; // 每分钟扩大的范围
const MAX_TRUESKILL_RANGE = 50; // 最大匹配范围
const MIN_PLAYERS_FOR_MATCH = 2; // 最少匹配人数
const PREFERRED_PLAYERS_FOR_MATCH = 4; // 理想匹配人数

export interface IMatchResult {
  matched: boolean;
  gameId?: string;
  players?: Array<{userId: string, userName: string}>;
}

/**
 * 尝试从队列中匹配玩家
 * 返回匹配结果（如果有匹配到的话）
 */
export async function tryMatchPlayers(): Promise<IMatchResult | null> {
  const queue = await Database.getInstance().getMatchmakingQueue();
  if (queue.length < MIN_PLAYERS_FOR_MATCH) {
    return null;
  }

  const now = new Date();

  // 按 trueskill 排序
  const sortedQueue = [...queue].sort((a, b) => a.trueskill - b.trueskill);

  // 尝试为每个玩家寻找匹配
  for (let i = 0; i < sortedQueue.length; i++) {
    const player = sortedQueue[i];
    const waitTimeMinutes = (now.getTime() - new Date(player.joinTime).getTime()) / 60000;

    // 根据等待时间扩大匹配范围
    const range = Math.min(
      INITIAL_TRUESKILL_RANGE + RANGE_EXPANSION_PER_MINUTE * waitTimeMinutes,
      MAX_TRUESKILL_RANGE,
    );

    // 寻找在范围内的玩家
    const matchedPlayers = [player];
    for (let j = 0; j < sortedQueue.length && matchedPlayers.length < PREFERRED_PLAYERS_FOR_MATCH; j++) {
      if (i === j) continue;
      const other = sortedQueue[j];
      const diff = Math.abs(player.trueskill - other.trueskill);

      // 对方的等待时间也会扩大匹配范围
      const otherWaitTimeMinutes = (now.getTime() - new Date(other.joinTime).getTime()) / 60000;
      const otherRange = Math.min(
        INITIAL_TRUESKILL_RANGE + RANGE_EXPANSION_PER_MINUTE * otherWaitTimeMinutes,
        MAX_TRUESKILL_RANGE,
      );

      // 双方的匹配范围取较大值
      const effectiveRange = Math.max(range, otherRange);

      if (diff <= effectiveRange) {
        matchedPlayers.push(other);
      }
    }

    // 如果匹配到足够的玩家
    if (matchedPlayers.length >= MIN_PLAYERS_FOR_MATCH) {
      // 从队列中移除这些玩家
      const playerInfos: Array<{userId: string, userName: string}> = [];
      for (const p of matchedPlayers) {
        await Database.getInstance().removeFromMatchmakingQueue(p.userId);
        const user = GameLoader.getInstance().userIdMap.get(p.userId);
        playerInfos.push({
          userId: p.userId,
          userName: user?.name || 'Unknown',
        });
      }

      console.log(`[Matchmaking] Match found! ${matchedPlayers.length} players: ${playerInfos.map((p) => p.userName).join(', ')}`);

      return {
        matched: true,
        players: playerInfos,
      };
    }
  }

  return null;
}
