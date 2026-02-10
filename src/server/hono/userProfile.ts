/**
 * User Profile API — /api/v2/user-profile
 *
 * Provides a public user profile endpoint that resolves users by ID or name.
 */

import {Hono} from 'hono';
import {GameLoader} from '../database/GameLoader';
import {User} from '../User';
import {UserRank} from '../../common/rank/RankManager';

export interface IUserProfileResponse {
  id: string;
  name: string;
  createtime: string;
  isvip: number;
  rank: {
    rankValue: number;
    mu: number;
    sigma: number;
    trueskill: number;
    points: number;
    seasonId: string;
    tier: {
      name: string;
      measurement: string;
      maxStars: number;
      stars: number;
      value: number;
    };
  } | null;
  /** Total number of games */
  totalGames: number;
}

function buildProfileResponse(user: User): IUserProfileResponse {
  const userRank: UserRank | undefined = GameLoader.getInstance().userRankMap.get(user.id);

  // Count games
  const gameIds = GameLoader.getInstance().usersToGames.get(user.id);
  const totalGames = gameIds ? gameIds.size : 0;

  let rankData: IUserProfileResponse['rank'] = null;
  if (userRank) {
    const tier = userRank.getTier();
    rankData = {
      rankValue: userRank.rankValue,
      mu: userRank.mu,
      sigma: userRank.sigma,
      trueskill: userRank.trueskill,
      points: userRank.points || 0,
      seasonId: userRank.seasonId || '',
      tier: {
        name: tier.name,
        measurement: tier.measurement,
        maxStars: tier.maxStars,
        stars: tier.stars,
        value: tier.value,
      },
    };
  }

  return {
    id: user.id,
    name: user.name,
    createtime: user.createtime || '',
    isvip: user.isvip(),
    rank: rankData,
    totalGames,
  };
}

export const userProfileRoutes = new Hono();

/**
 * GET /api/v2/user-profile/:identifier
 *
 * Looks up a user by ID or name (case-insensitive).
 * The identifier is first tried as a user ID, then as a username.
 */
userProfileRoutes.get('/:identifier', (c) => {
  const identifier = c.req.param('identifier');

  if (!identifier) {
    return c.json({error: 'Missing user identifier'}, 400);
  }

  // Try by ID first
  let user: User | undefined = GameLoader.getInstance().userIdMap.get(identifier);

  // Then try by name (userNameMap stores names in lowercase)
  if (!user) {
    user = GameLoader.getInstance().userNameMap.get(identifier.toLowerCase());
  }

  if (!user) {
    return c.json({error: 'User not found'}, 404);
  }

  return c.json(buildProfileResponse(user));
});
