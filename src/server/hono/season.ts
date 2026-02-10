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

export {seasonRoutes};
