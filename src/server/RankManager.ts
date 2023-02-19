
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

export interface RankLevel {
  levelName: LevelName;
  starNumber: number;
  description: string;
  // canClaim: (player: Player) => boolean;
  // getScore: (player: Player) => number;
}

export enum LevelName {
  LEVEL_1 = 'Mars lander',
  LEVEL_2 = 'loading',
  LEVEL_3 = 'loaded',
}

export const DEFAULT_RANK_VALUE = 3;
export const DEFAULT_MU = 25.000;
export const DEFAULT_SIGMA = 8.333;

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
    console.log('getRankValue', this.rankValue);
    // return 15;
    return this.rankValue;
  }

  public getTier() {
    console.log('getRankValue', this.rankValue);
    // return 15;
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

export class RankTier {
  constructor(
      public name: string,
      public measurement: 'star' | 'value', // 展示方式为星星或者数字
      public maxStars: number,
      public stars: number = 0,
      public value: number = 0,
  ) {}
}

export const RankTiers = [
  new RankTier('Bronze', 'star', 3),
  new RankTier('Silver', 'star', 3),
  new RankTier('Gold', 'star', 5),
  new RankTier('Platinum', 'star', 5),
  new RankTier('Diamond', 'star', 5),
  new RankTier('Master', 'star', 5),
  new RankTier('Grandmaster', 'value', Infinity),
];
