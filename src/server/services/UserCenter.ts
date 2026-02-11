/**
 * UserCenter — 用户相关的业务逻辑服务层
 *
 * 将业务逻辑从 HTTP handler 中剥离，使得 Hono 路由和旧的 requestProcessor 路由
 * 可以共享相同的业务逻辑，避免代码重复。
 *
 * 使用方式：
 *   import {UserCenter} from '../services/UserCenter';
 *
 *   // 在 Hono 路由中
 *   const data = UserCenter.getSeasonInfo();
 *
 *   // 在旧的 UserManager 中
 *   const data = UserCenter.getSeasonInfo();
 *   res.write(JSON.stringify(data));
 */

import {Database} from '../database/Database';
import {GameLoader} from '../database/GameLoader';
import {getSeasonId, getSeasonInfo as getSeasonInfoFn, ISeasonInfo, getPreviousSeasonId} from '../../common/rank/SeasonManager';
import {tryMatchPlayers, IMatchResult} from '../rank/MatchmakingHandler';
import {UserRank} from '../../common/rank/RankManager';
import {DEFAULT_MU, DEFAULT_RANK_VALUE, DEFAULT_SIGMA} from '../../common/rank/constants';
import {runSeasonReset, ISeasonResetResult} from '../rank/SeasonResetHandler';
import {RankTier} from '../../common/rank/RankTier';

// ========== 返回类型定义 ==========

export interface ISeasonInfoResponse {
  seasonId: string;
  seasonName: string;
  startDate: string;
  endDate: string;
}

export interface ISeasonSnapshotEntry {
  userId: string;
  rankValue: number;
  mu: number;
  sigma: number;
  trueskill: number;
  pointsEarned: number;
  finalPosition: number;
  userName: string;
}

export interface ISeasonHistoryResponse {
  seasonId: string;
  snapshots: Array<ISeasonSnapshotEntry>;
}

export interface ISeasonListResponse {
  currentSeasonId: string;
  previousSeasonId: string;
}

export interface ISeasonLeaderboardEntry {
  userName: string;
  userTier: RankTier;
  rankValue: number;
  trueskill: number;
  seasonId: string;
  finalPosition?: number;
  pointsEarned?: number;
}

export interface ISeasonLeaderboardResponse {
  seasonId: string;
  isCurrentSeason: boolean;
  allUserRanks: Array<ISeasonLeaderboardEntry>;
}

export interface IJoinMatchmakingResponse {
  status: string;
  match: IMatchResult | null;
}

export interface ILeaveMatchmakingResponse {
  status: string;
}

export interface IPollMatchmakingResponse {
  inQueue: boolean;
  queueSize: number;
  match: IMatchResult | null;
}

export interface IUserRankResponse {
  userId: string;
  rankValue: number;
  mu: number;
  sigma: number;
  trueskill: number;
  points: number;
  seasonId: string;
}

export interface ISeasonResetRequest {
  expectedFromSeasonId?: string;
  dryRun?: boolean;
}

// ========== 错误类型 ==========

export class ServiceError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ServiceError';
    // 必须：ES5 target 下 extends Error 的 instanceof 不生效
    Object.setPrototypeOf(this, ServiceError.prototype);
  }
}

// ========== UserCenter 业务逻辑 ==========

export class UserCenter {
  /**
   * 获取当前赛季信息
   */
  static getSeasonInfo(now: Date = new Date()): ISeasonInfoResponse {
    const seasonInfo: ISeasonInfo = getSeasonInfoFn(now);
    const currentSeasonId = getSeasonId(now);

    return {
      seasonId: currentSeasonId,
      seasonName: seasonInfo.seasonName,
      startDate: seasonInfo.startDate.toISOString(),
      endDate: seasonInfo.endDate.toISOString(),
    };
  }

  /**
   * 获取赛季历史快照
   */
  static async getSeasonHistory(seasonId: string): Promise<ISeasonHistoryResponse> {
    if (!seasonId) {
      throw new ServiceError(400, 'Missing seasonId parameter');
    }

    const snapshots = await Database.getInstance().getSeasonSnapshots(seasonId);
    const result: Array<ISeasonSnapshotEntry> = snapshots.map((s) => {
      const user = GameLoader.getInstance().userIdMap.get(s.userId);
      return {
        ...s,
        userName: user?.name || 'Unknown',
      };
    });

    return {seasonId, snapshots: result};
  }

  /**
   * 返回可选的赛季信息（当前与上一赛季）
   */
  static getSeasonList(now: Date = new Date()): ISeasonListResponse {
    const currentSeasonId = getSeasonId(now);
    return {
      currentSeasonId,
      previousSeasonId: getPreviousSeasonId(currentSeasonId),
    };
  }

  /**
   * 获取赛季排行榜
   * - 当前赛季: 读取实时 user_rank
   * - 历史赛季: 读取赛季快照 rank_seasons
   */
  static async getSeasonLeaderboard(seasonId: string, limit = 100): Promise<ISeasonLeaderboardResponse> {
    if (!seasonId) {
      throw new ServiceError(400, 'Missing seasonId parameter');
    }
    const currentSeasonId = getSeasonId();
    if (seasonId === currentSeasonId) {
      const allUserRanks = await Database.getInstance().getUserRanks(Math.min(100, limit));
      const rankList = Array.isArray(allUserRanks) ? allUserRanks : [];
      const entries = rankList.map((userRank) => {
        const user = GameLoader.getInstance().userIdMap.get(userRank.userId);
        return {
          userName: user?.name || 'Unknown',
          userTier: userRank.getTier(),
          rankValue: userRank.rankValue,
          trueskill: userRank.trueskill,
          seasonId: userRank.seasonId || currentSeasonId,
        };
      });
      return {
        seasonId,
        isCurrentSeason: true,
        allUserRanks: entries,
      };
    }
    const snapshots = await Database.getInstance().getSeasonSnapshots(seasonId);
    const entries = snapshots.slice(0, Math.min(100, limit)).map((snapshot) => {
      const user = GameLoader.getInstance().userIdMap.get(snapshot.userId);
      const userRank = new UserRank(
        snapshot.userId,
        snapshot.rankValue,
        snapshot.mu,
        snapshot.sigma,
        snapshot.trueskill,
        0,
        seasonId,
      );
      return {
        userName: user?.name || 'Unknown',
        userTier: userRank.getTier(),
        rankValue: snapshot.rankValue,
        trueskill: snapshot.trueskill,
        seasonId,
        finalPosition: snapshot.finalPosition,
        pointsEarned: snapshot.pointsEarned,
      };
    });
    return {
      seasonId,
      isCurrentSeason: false,
      allUserRanks: entries,
    };
  }

  /**
   * 触发赛季重置（admin）
   */
  static async triggerSeasonReset(payload: ISeasonResetRequest): Promise<ISeasonResetResult> {
    return await runSeasonReset({
      expectedFromSeasonId: payload.expectedFromSeasonId,
      dryRun: payload.dryRun === true,
      triggeredBy: 'admin',
    });
  }

  /**
   * 加入匹配队列
   */
  static async joinMatchmaking(userId: string, gameOptions: any): Promise<IJoinMatchmakingResponse> {
    if (!userId) {
      throw new ServiceError(400, 'Missing userId');
    }

    const userRank = GameLoader.getInstance().userRankMap.get(userId);
    if (userRank === undefined) {
      throw new ServiceError(404, 'User has no rank. Please activate rank first.');
    }

    await Database.getInstance().addToMatchmakingQueue(
      userId,
      userRank.trueskill,
      JSON.stringify(gameOptions || {}),
    );
    console.log(`[Matchmaking] User ${userId} joined queue (trueskill: ${userRank.trueskill})`);

    const matchResult = await tryMatchPlayers();

    return {status: 'queued', match: matchResult};
  }

  /**
   * 离开匹配队列
   */
  static async leaveMatchmaking(userId: string): Promise<ILeaveMatchmakingResponse> {
    if (!userId) {
      throw new ServiceError(400, 'Missing userId');
    }

    await Database.getInstance().removeFromMatchmakingQueue(userId);
    console.log(`[Matchmaking] User ${userId} left queue`);

    return {status: 'left'};
  }

  /**
   * 轮询匹配状态
   */
  static async pollMatchmaking(userId: string): Promise<IPollMatchmakingResponse> {
    if (!userId) {
      throw new ServiceError(400, 'Missing userId');
    }

    const matchResult = await tryMatchPlayers();
    const queue = await Database.getInstance().getMatchmakingQueue();
    const inQueue = queue.some((q) => q.userId === userId);
    const queueSize = queue.length;

    return {inQueue, queueSize, match: matchResult};
  }

  /**
   * 获取/创建用户排名
   */
  static getUserRank(userId: string | null, playerName: string | null): IUserRankResponse {
    let resolvedUserId = userId;

    if (!resolvedUserId && playerName) {
      const user = GameLoader.getInstance().userNameMap.get(playerName);
      if (user !== undefined) {
        resolvedUserId = user.id;
      }
    }

    if (!resolvedUserId) {
      throw new ServiceError(404, 'not find user id or player name');
    }

    let userRank: UserRank | undefined = GameLoader.getInstance().userRankMap.get(resolvedUserId);
    if (userRank === undefined) {
      userRank = new UserRank(resolvedUserId, DEFAULT_RANK_VALUE, DEFAULT_MU, DEFAULT_SIGMA, 0, 0, getSeasonId());
      Database.getInstance().addUserRank(userRank);
      GameLoader.getInstance().addOrUpdateUserRank(userRank);
    }

    return {
      userId: userRank.userId,
      rankValue: userRank.rankValue,
      mu: userRank.mu,
      sigma: userRank.sigma,
      trueskill: userRank.trueskill,
      points: userRank.points || 0,
      seasonId: userRank.seasonId || '',
    };
  }

  /**
   * 激活用户排名
   */
  static activateRank(userId: string): void {
    if (!userId) {
      throw new ServiceError(400, 'Missing userId');
    }

    const currentSeasonId = getSeasonId();
    let userRank = GameLoader.getInstance().userRankMap.get(userId);
    if (userRank === null || userRank === undefined) {
      userRank = new UserRank(userId, DEFAULT_RANK_VALUE, DEFAULT_MU, DEFAULT_SIGMA, 0, 0, currentSeasonId);
      Database.getInstance().addUserRank(userRank);
      GameLoader.getInstance().addOrUpdateUserRank(userRank);
    }
  }
}
