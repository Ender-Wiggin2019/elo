
// import * as http from 'http';
import {User} from './User';
// import {Database} from './database/Database';
// import {getDate, getDay, myId} from './UserUtil';
// import {GameLoader} from './database/GameLoader';
// import {generateRandomId} from './server-ids';
// import {Server} from './models/ServerModel';
// import {PlayerBlockModel} from '../common/models/PlayerModel';
// import {Context} from './routes/IHandler';
// import {UnexpectedInput} from './routes/UnexpectedInput';
// import * as crypto from 'crypto';

import {Rating, rate} from 'ts-trueskill';

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

export const DEFAULT_RANK_VALUE = 1;
export const DEFAULT_MU = 25.000;
export const DEFAULT_SIGMA = 8.333;

export class RankSystem {
  public getNewSkill(userResult: Array<UserRank>): Array<UserRank> {
    const updatedRanks = [];
    const ratings = userResult.map((userRank) => userRank.rankValue);
    const updatedRatings = rate(ratings);
    for (let i = 0; i < userResult.length; i++) {
      const updatedRank = {
        user: userResult[i].user,
        rankValue: updatedRatings[i][0], // the value of Rating
      };
      updatedRanks.push(updatedRank);
    }
    return updatedRanks;
  }
}


export interface UserRank {
    user: User,
    rankValue: Rating,
}
