
// import * as http from 'http';
// import {User} from './User';
// import {Database} from './database/Database';
// import {getDate, getDay, myId} from './UserUtil';
// import {GameLoader} from './database/GameLoader';
// import {generateRandomId} from './server-ids';
// import {Server} from './models/ServerModel';
// import {PlayerBlockModel} from '../common/models/PlayerModel';
// import {Context} from './routes/IHandler';
// import {UnexpectedInput} from './routes/UnexpectedInput';
// import * as crypto from 'crypto';

// import {Rating} from 'ts-trueskill';
// import {rate} from 'ts-trueskill';


export const DEFAULT_RANK_VALUE = 0;
export const DEFAULT_MU = 25.000;
export const DEFAULT_SIGMA = 8.333;
export const DEFAULT_TIMEOUT_PENALTY = -2; // 超时扣分
export const DEFAULT_TIMEOUT_COMPENSATE = 1; // 超时补偿

const rankValueChangeRules = [
  [1, -1], // 2p
  [1, 0, -1],
  [2, 1, 0, -1],
  [2, 1, 0, -1, -2], // 5p
];
// export class RankSystem {
//   public getNewSkill(userResult: Array<UserRank>): Array<UserRank> {
//     const updatedRanks = [];
//     const ratings = userResult.map((userRank) => userRank.rankValue);
//     const updatedRatings = rate(ratings);
//     for (let i = 0; i < userResult.length; i++) {
//       const updatedRank = new UserRank(userResult[i].user, userResult[i].rankValue, updatedRatings[i][0]);
//       updatedRanks.push(updatedRank);
//     }
//     return updatedRanks;
//   }
// }


export class UserRank {
  constructor(
      public userId: string,
      public rankValue: number,
      public mu: number,
      public sigma: number,
    // public rating: Rating,
  ) {}

  public getRankValue() {
    return this.rankValue;
  }

  // 根据玩家人数更新玩家的分数，@param playerNumber: 玩家人数；@param playerPosition 结束游戏时的排位，从0开始
  public getRankValueDeltaByPosition(playerNumber: number, playerPosition: number): number {
    const p = Math.max(playerNumber - 2, 0); // 避免小于0
    const pos = Math.min(playerPosition, rankValueChangeRules[p].length);
    return rankValueChangeRules[p][pos]; // 返回增加/减少的对应分数
  }

  public setRankValueDeltaByPosition(playerNumber: number, playerPosition: number): void {
    const delta = this.getRankValueDeltaByPosition(playerNumber, playerPosition);
    const tier = this.getTier();
    if (tier.maxStars === 3 && delta < 0) return; // 暂时hardcode, 前面的段位（maxStars为3）不降星
    if (this.rankValue + delta >= 0) this.rankValue += delta; // 不低于0
  }

  public setRankValueDeltaByTimeOut(timeOut: boolean): void {
    const delta = timeOut ? DEFAULT_TIMEOUT_PENALTY : DEFAULT_TIMEOUT_COMPENSATE;
    if (this.rankValue + delta >= 0) this.rankValue += delta; // 不低于0
  }

  public getTier() {
    let rankValue = this.rankValue;
    for (const rank of RankTiers) {
      if (rank.measurement === 'value') {
        const tierValue = this.mu - 3 * this.sigma; // trueSkill分数的计算方式
        return new RankTier(rank.name, rank.measurement, rank.maxStars, rank.stars, tierValue); // 如果按照value，则取tierValue
      } else if (rankValue <= rank.maxStars) { // 如果小于最高星星数，则取对应段位
        return new RankTier(rank.name, rank.measurement, rank.maxStars, rankValue);
      } else { // 如果rankValue > rank.maxStars，则晋级
        rankValue = rankValue - rank.maxStars;
      }
    }

    return new RankTier(RankTiers[0].name, RankTiers[0].measurement, RankTiers[0].maxStars); // default state
  }
}

export enum TierName {
  IRON = 'Iron',
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold',
  PLATINUM = 'Platinum',
  DIAMOND = 'Diamond',
  MASTER = 'Master',
  GRANDMASTER = 'Grandmaster',
  CHALLENGER = 'Challenger',
}

export class RankTier {
  constructor(
      public name: TierName,
      public measurement: 'star' | 'value', // 展示方式为星星或者数字
      public maxStars: number,
      public stars: number = 0,
      public value: number = 0,
  ) {}
}


export const RankTiers = [
  new RankTier(TierName.IRON, 'star', 3),
  new RankTier(TierName.BRONZE, 'star', 3),
  new RankTier(TierName.SILVER, 'star', 3),
  new RankTier(TierName.GOLD, 'star', 5),
  new RankTier(TierName.PLATINUM, 'star', 5),
  new RankTier(TierName.DIAMOND, 'star', 5),
  new RankTier(TierName.MASTER, 'star', 5),
  new RankTier(TierName.GRANDMASTER, 'star', 5),
  new RankTier(TierName.CHALLENGER, 'value', Infinity),
];

// 返回CHALLENGER需要的星星数量
export function getChallengerValue(): number {
  let res = 1; // 晋级需要+1
  RankTiers.filter((rankTier) => rankTier.name !== TierName.CHALLENGER).forEach((rankTier) => res += rankTier.maxStars);
  return res;
}

// 天梯 根据原始排位，给出更新后的排位，@param timeOutUser 超时玩家自动判负
export async function getNewSkills(userRanks: Array<UserRank>, timeOutUser: UserRank | undefined): Promise<Array<UserRank>> {
  const {Rating, rate} = await import('ts-trueskill');
  const playerNumber = userRanks.length;
  const updatedRanks: Array<UserRank> = [];

  if (timeOutUser === undefined) { // 正常情况
    const ratings = userRanks.map((userRank) => [new Rating(userRank.mu, userRank.sigma)]); // Rating[][]
    const updatedRatings = rate(ratings);
    for (let i = 0; i < playerNumber; i++) {
      const userRank = userRanks[i];
      userRank.setRankValueDeltaByPosition(playerNumber, i);
      userRank.mu = updatedRatings[i][0].mu;
      userRank.sigma = updatedRatings[i][0].sigma;
      updatedRanks.push(userRank);
    }
  } else { // 超时情况 不会影响隐藏分，只扣表现分
    for (let i = 0; i < playerNumber; i++) {
      const userRank = userRanks[i];
      userRank.setRankValueDeltaByTimeOut(userRank === timeOutUser);
      updatedRanks.push(userRank);
    }
  }
  return updatedRanks;
}

