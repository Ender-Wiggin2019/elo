/**
 * 赛季相关 API 路由
 *
 * 挂载路径: /api/v2/season
 *
 * GET  /info       - 获取当前赛季信息
 * GET  /history    - 获取赛季历史快照
 */

import {Hono} from 'hono';
import {UserCenter, ServiceError} from '../services/UserCenter';
import {serverId as expectedServerId} from '../utils/server-ids';

const seasonRoutes = new Hono();

seasonRoutes.get('/info', (c) => {
  return c.json(UserCenter.getSeasonInfo());
});

seasonRoutes.get('/history', async (c) => {
  const seasonId = c.req.query('seasonId');
  try {
    const result = await UserCenter.getSeasonHistory(seasonId || '');
    return c.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return c.json({error: err.message}, err.statusCode as any);
    }
    console.error('[Hono] getSeasonHistory error:', err);
    return c.json({error: 'Error fetching season history'}, 500);
  }
});

seasonRoutes.get('/list', (c) => {
  return c.json(UserCenter.getSeasonList());
});

seasonRoutes.get('/leaderboard', async (c) => {
  const seasonId = c.req.query('seasonId');
  const rawLimit = Number(c.req.query('limit') || 100);
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(100, Math.floor(rawLimit)) : 100;
  try {
    const result = await UserCenter.getSeasonLeaderboard(seasonId || '', limit);
    return c.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return c.json({error: err.message}, err.statusCode as any);
    }
    console.error('[Hono] getSeasonLeaderboard error:', err);
    return c.json({error: 'Error fetching season leaderboard'}, 500);
  }
});

seasonRoutes.post('/admin/reset', async (c) => {
  const serverId = c.req.query('serverId');
  if (!serverId || serverId !== expectedServerId) {
    return c.json({error: 'not authorized'}, 401);
  }
  let payload: {expectedFromSeasonId?: string; dryRun?: boolean};
  try {
    payload = await c.req.json();
  } catch (err) {
    return c.json({error: 'invalid request body'}, 400);
  }
  try {
    const result = await UserCenter.triggerSeasonReset(payload || {});
    return c.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return c.json({error: err.message}, err.statusCode as any);
    }
    const message = err instanceof Error ? err.message : 'season reset failed';
    return c.json({error: message}, 500);
  }
});

export {seasonRoutes};
