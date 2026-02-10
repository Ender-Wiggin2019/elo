/**
 * 匹配队列 API 路由
 *
 * 挂载路径: /api/v2/matchmaking
 *
 * POST /join   - 加入匹配队列
 * POST /leave  - 离开匹配队列
 * GET  /poll   - 轮询匹配状态
 */

import {Hono} from 'hono';
import {UserCenter, ServiceError} from '../services/UserCenter';

const matchmakingRoutes = new Hono();

matchmakingRoutes.post('/join', async (c) => {
  const body = await c.req.json();
  try {
    const result = await UserCenter.joinMatchmaking(body.userId, body.gameOptions);
    return c.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return c.json({error: err.message}, err.statusCode as any);
    }
    console.error('[Hono] joinMatchmaking error:', err);
    return c.json({error: 'Error joining matchmaking'}, 500);
  }
});

matchmakingRoutes.post('/leave', async (c) => {
  const body = await c.req.json();
  try {
    const result = await UserCenter.leaveMatchmaking(body.userId);
    return c.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return c.json({error: err.message}, err.statusCode as any);
    }
    console.error('[Hono] leaveMatchmaking error:', err);
    return c.json({error: 'Error leaving matchmaking'}, 500);
  }
});

matchmakingRoutes.get('/poll', async (c) => {
  const userId = c.req.query('userId');
  try {
    const result = await UserCenter.pollMatchmaking(userId || '');
    return c.json(result);
  } catch (err) {
    if (err instanceof ServiceError) {
      return c.json({error: err.message}, err.statusCode as any);
    }
    console.error('[Hono] pollMatchmaking error:', err);
    return c.json({error: 'Error polling matchmaking'}, 500);
  }
});

export {matchmakingRoutes};
