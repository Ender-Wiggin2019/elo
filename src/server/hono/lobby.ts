/**
 * 游戏大厅 API 路由
 *
 * 挂载路径: /api/v2/lobby
 *
 * POST   /create          - 创建房间
 * GET    /list             - 获取房间列表
 * GET    /:roomId          - 获取房间详情
 * GET    /:roomId/colors   - 获取可用颜色
 * POST   /:roomId/join     - 加入房间
 * POST   /:roomId/leave    - 离开房间
 * POST   /:roomId/kick     - 房主踢人
 * POST   /:roomId/start    - 房主发起开始（进入确认阶段）
 * POST   /:roomId/confirm  - 玩家确认准备
 * GET    /:roomId/poll     - 轮询房间状态
 */

import {Hono} from 'hono';
import {LobbyService} from '../services/LobbyService';
import {ServiceError} from '../services/UserCenter';

const lobbyRoutes = new Hono();

/** 统一错误处理 */
function handleError(err: unknown, c: any) {
  if (err instanceof ServiceError) {
    return c.json({error: err.message}, err.statusCode as any);
  }
  console.error('[Hono Lobby] Error:', err);
  return c.json({error: 'Internal server error'}, 500);
}

// POST /create — 创建房间
lobbyRoutes.post('/create', async (c) => {
  try {
    const body = await c.req.json();
    const room = LobbyService.createRoom(body);
    return c.json({room});
  } catch (err) {
    return handleError(err, c);
  }
});

// GET /list — 获取房间列表
lobbyRoutes.get('/list', (c) => {
  try {
    const rooms = LobbyService.listRooms();
    return c.json({rooms});
  } catch (err) {
    return handleError(err, c);
  }
});

// GET /:roomId — 获取房间详情
lobbyRoutes.get('/:roomId', (c) => {
  try {
    const roomId = c.req.param('roomId');
    const room = LobbyService.getRoom(roomId);
    return c.json({room});
  } catch (err) {
    return handleError(err, c);
  }
});

// GET /:roomId/colors — 获取可用颜色
lobbyRoutes.get('/:roomId/colors', (c) => {
  try {
    const roomId = c.req.param('roomId');
    const colors = LobbyService.getAvailableColors(roomId);
    return c.json({colors});
  } catch (err) {
    return handleError(err, c);
  }
});

// POST /:roomId/join — 加入房间
lobbyRoutes.post('/:roomId/join', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    const room = LobbyService.joinRoom(roomId, body);
    return c.json({room});
  } catch (err) {
    return handleError(err, c);
  }
});

// POST /:roomId/leave — 离开房间
lobbyRoutes.post('/:roomId/leave', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    const room = LobbyService.leaveRoom(roomId, body.userId);
    return c.json({room, closed: room === null});
  } catch (err) {
    return handleError(err, c);
  }
});

// POST /:roomId/kick — 房主踢人
lobbyRoutes.post('/:roomId/kick', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    const room = LobbyService.kickPlayer(roomId, body);
    return c.json({room});
  } catch (err) {
    return handleError(err, c);
  }
});

// POST /:roomId/start — 房主发起开始
lobbyRoutes.post('/:roomId/start', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    const room = LobbyService.startConfirm(roomId, body.userId);
    return c.json({room});
  } catch (err) {
    return handleError(err, c);
  }
});

// POST /:roomId/confirm — 玩家确认准备
lobbyRoutes.post('/:roomId/confirm', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    const room = LobbyService.confirmReady(roomId, body.userId);

    // 检查是否所有人都已确认
    const allReady = LobbyService.isAllReady(roomId);

    if (allReady) {
      // 构建 NewGameConfig，供客户端调用创建游戏接口
      const gameConfig = LobbyService.buildNewGameConfig(roomId);
      return c.json({room, allReady: true, gameConfig});
    }

    return c.json({room, allReady: false});
  } catch (err) {
    return handleError(err, c);
  }
});

// GET /:roomId/poll — 轮询房间状态
lobbyRoutes.get('/:roomId/poll', (c) => {
  try {
    const roomId = c.req.param('roomId');
    const room = LobbyService.getRoom(roomId);
    const allReady = room.players.every((p) => p.isReady);

    let gameConfig = undefined;
    if (allReady && LobbyService.isAllReady(roomId)) {
      gameConfig = LobbyService.buildNewGameConfig(roomId);
    }

    return c.json({room, allReady, gameConfig});
  } catch (err) {
    return handleError(err, c);
  }
});

// POST /:roomId/markStarted — 标记游戏已创建
lobbyRoutes.post('/:roomId/markStarted', async (c) => {
  try {
    const roomId = c.req.param('roomId');
    const body = await c.req.json();
    const room = LobbyService.markStarted(roomId, body.gameId, body.gameData);
    return c.json({room});
  } catch (err) {
    return handleError(err, c);
  }
});

export {lobbyRoutes};
