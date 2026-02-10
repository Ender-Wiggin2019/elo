/* eslint-disable @typescript-eslint/prefer-for-of */
/**
 * API 集成测试脚本 — 模拟真实用户场景
 *
 * 流程：
 *   1. 注册多个测试账号
 *   2. 登录获取 token
 *   3. 激活排名
 *   4. 查询赛季信息
 *   5. 创建天梯游戏
 *   6. 坐下（sitDown）
 *   7. 触发游戏结束 / 放弃
 *   8. 检查 UserRank 变化
 *   9. 匹配队列操作
 *   10. 清理（可选）
 *
 * 用法:
 *   npm start                     # 先启动服务
 *   npm run test:api              # 运行测试
 *   # 完整测试（含正常结束 → 排名更新）：服务端和测试都需 TEST_API=true
 *   TEST_API=true pnpm dev:bun     # 启动服务（另开终端）
 *   TEST_API=true pnpm test:api    # 运行完整测试
 *   BASE_URL=http://x npm run test:api  # 指定地址
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8081';

// ===== 工具函数 =====

interface ITestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: Array<ITestResult> = [];
let currentSection = '';

function section(name: string): void {
  currentSection = name;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${name}`);
  console.log(`${'─'.repeat(50)}`);
}

async function test(name: string, fn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    results.push({name: `[${currentSection}] ${name}`, passed: true, duration: Date.now() - start});
    console.log(`  ✔ ${name} (${Date.now() - start}ms)`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({name: `[${currentSection}] ${name}`, passed: false, error: msg, duration: Date.now() - start});
    console.log(`  ✘ ${name} — ${msg}`);
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function req(method: string, path: string, body?: any): Promise<{status: number, data: any}> {
  const url = `${BASE_URL}${path}`;
  const options: any = {
    method,
    headers: body !== undefined ? {'Content-Type': 'application/json'} : {},
    body: body !== undefined ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
  };
  const res = await fetch(url, options);
  let data: any;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {status: res.status, data};
}

// ===== 测试状态 =====

const TEST_PREFIX = `_test_${Date.now()}_`;
const users: Array<{name: string, password: string, token: string}> = [];

function userName(index: number): string {
  return `${TEST_PREFIX}user${index}`;
}

// ===== 测试用例 =====

async function main(): Promise<void> {
  console.log(`\n🔗 API Integration Test — ${BASE_URL}\n`);

  // 检查服务是否可达
  try {
    await fetch(BASE_URL, {signal: AbortSignal.timeout(3000)});
  } catch {
    console.error(`❌ Cannot connect to ${BASE_URL}. Is the server running?\n`);
    console.error('   Start with: npm start  (or npm run dev:server)\n');
    process.exit(1);
  }

  // ─── 1. 注册账号 ───
  section('1. Register');

  for (let i = 0; i < 4; i++) {
    const name = userName(i);
    const password = 'testpass123';
    await test(`Register user "${name}"`, async () => {
      const {status, data} = await req('POST', '/api/register', {userName: name, password});
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      users.push({name, password, token: ''});
    });
  }

  // ─── 2. 登录 ───
  section('2. Login');

  for (let i = 0; i < users.length; i++) {
    await test(`Login user "${users[i].name}"`, async () => {
      const {status, data} = await req('POST', '/api/login', {
        userName: users[i].name,
        password: users[i].password,
      });
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(typeof data.id === 'string' && data.id.length > 0, 'Expected token in response.id');
      assert(data.name === users[i].name, `Expected name ${users[i].name}, got ${data.name}`);
      users[i].token = data.id;
    });
  }

  // ─── 3. 赛季信息 ───
  section('3. Season Info');

  await test('GET /api/v2/season/info returns valid data', async () => {
    const {status, data} = await req('GET', '/api/v2/season/info');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(/^\d{4}-S[1-6]$/.test(data.seasonId), `Invalid seasonId: ${data.seasonId}`);
    assert(typeof data.seasonName === 'string', 'Missing seasonName');
    console.log(`    Current season: ${data.seasonName}`);
  });

  await test('GET /api/v2/season/history with seasonId', async () => {
    const {status, data} = await req('GET', '/api/v2/season/history?seasonId=2026-S1');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(Array.isArray(data.snapshots), 'Expected snapshots array');
  });

  // ─── 4. 激活排名 ───
  section('4. Activate Rank');

  for (let i = 0; i < users.length; i++) {
    await test(`Activate rank for "${users[i].name}"`, async () => {
      const {status, data} = await req('POST', '/api/activateRank', {userId: users[i].token});
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    });
  }

  // ─── 5. 查询初始排名 ───
  section('5. Check Initial Rank');

  const initialRanks: Array<any> = [];
  for (let i = 0; i < users.length; i++) {
    await test(`Get rank for "${users[i].name}"`, async () => {
      const {status, data} = await req('GET', `/api/userrank?playerName=${users[i].name}`);
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(typeof data.rankValue === 'number', 'Missing rankValue');
      assert(typeof data.mu === 'number', 'Missing mu');
      assert(typeof data.sigma === 'number', 'Missing sigma');
      assert(typeof data.trueskill === 'number', 'Missing trueskill');
      initialRanks.push(data);
      console.log(`    rank=${data.rankValue} mu=${data.mu.toFixed(2)} sigma=${data.sigma.toFixed(2)} trueskill=${data.trueskill.toFixed(2)}`);
    });
  }

  // ─── 6. 匹配队列操作 ───
  section('6. Matchmaking Queue');

  await test('Join matchmaking for user 0', async () => {
    const {status, data} = await req('POST', '/api/v2/matchmaking/join', {
      userId: users[0].token,
      gameOptions: {},
    });
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
    assert(data.status === 'queued', `Expected status 'queued', got ${data.status}`);
  });

  await test('Poll matchmaking — user 0 in queue', async () => {
    const {status, data} = await req('GET', `/api/v2/matchmaking/poll?userId=${users[0].token}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.inQueue === true, 'Expected user to be in queue');
    assert(data.queueSize >= 1, `Expected queueSize >= 1, got ${data.queueSize}`);
    console.log(`    Queue size: ${data.queueSize}`);
  });

  await test('Leave matchmaking for user 0', async () => {
    const {status, data} = await req('POST', '/api/v2/matchmaking/leave', {userId: users[0].token});
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.status === 'left', `Expected status 'left', got ${data.status}`);
  });

  await test('Poll matchmaking — user 0 no longer in queue', async () => {
    const {status, data} = await req('GET', `/api/v2/matchmaking/poll?userId=${users[0].token}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.inQueue === false, 'Expected user to NOT be in queue');
  });

  // ─── 7. 创建天梯游戏 ───
  section('7. Create Rank Game');

  let gameId = '';
  let playerIds: Array<string> = [];

  await test('Create a 2-player rank game', async () => {
    const gameConfig = {
      players: [
        {name: users[0].name, color: 'blue', beginner: false, handicap: 0, first: true},
        {name: users[1].name, color: 'red', beginner: false, handicap: 0, first: false},
      ],
      expansions: {
        corpera: true, prelude: false, prelude2: false, venus: false,
        colonies: false, turmoil: false, promo: false, breakthrough: false,
        eros: false, community: false, ares: false, moon: false,
        pathfinders: false, ceo: false, starwars: false, underworld: false,
        commission: false,
      },
      board: 'tharsis',
      seed: Math.random().toString(36).substring(7),
      randomFirstPlayer: false,
      undoOption: false,
      rankOption: true, // 天梯模式
      showTimers: false,
      fastModeOption: false,
      showOtherPlayersVP: false,
      aresExtremeVariant: false,
      politicalAgendasExtension: 'Standard',
      solarPhaseOption: false,
      removeNegativeGlobalEventsOption: false,
      modularMA: 'Standard',
      draftVariant: false,
      initialDraft: false,
      preludeDraftVariant: false,
      ceosDraftVariant: false,
      startingCorporations: 2,
      startingCeos: 0,
      startingPreludes: 0,
      shuffleMapOption: false,
      randomMA: 'No randomization',
      includeFanMA: false,
      soloTR: false,
      customCorporationsList: [],
      bannedCards: [],
      includedCards: [],
      customColoniesList: [],
      customPreludes: [],
      customCeos: [],
      requiresMoonTrackCompletion: false,
      requiresVenusTrackCompletion: false,
      moonStandardProjectVariant: false,
      moonStandardProjectVariant1: false,
      altVenusBoard: false,
      heatFor: false,
      doubleCorp: false,
      initialCorpDraftVariant: false,
      userId: users[0].token,
    };

    const {status, data} = await req('POST', '/api/creategame', gameConfig);
    assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data).substring(0, 200)}`);
    assert(typeof data.id === 'string', 'Missing game id');
    assert(Array.isArray(data.players), 'Missing players array');

    gameId = data.id;
    playerIds = data.players.map((p: any) => p.id);
    console.log(`    Game ID: ${gameId}`);
    console.log(`    Player IDs: ${playerIds.join(', ')}`);
  });

  // ─── 8. 坐下（绑定用户到座位）───
  section('8. Sit Down');

  if (gameId && playerIds.length >= 2) {
    await test(`User 0 sits down at player ${playerIds[0]}`, async () => {
      const {status, data} = await req('POST', '/api/sitDown', {
        userId: users[0].token,
        playerId: playerIds[0],
      });
      // 可能成功也可能失败（如果玩家名已绑定）
      console.log(`    Status: ${status}, Response: ${typeof data === 'string' ? data : JSON.stringify(data).substring(0, 100)}`);
    });

    await test(`User 1 sits down at player ${playerIds[1]}`, async () => {
      const {status, data} = await req('POST', '/api/sitDown', {
        userId: users[1].token,
        playerId: playerIds[1],
      });
      console.log(`    Status: ${status}, Response: ${typeof data === 'string' ? data : JSON.stringify(data).substring(0, 100)}`);
    });
  }

  // ─── 9. 触发游戏结束（模拟全员放弃）───
  // 注意：当所有玩家都放弃时，phase=ABANDON，按设计不更新排名（玩家放弃游戏，无事发生）
  section('9. Trigger Game End (All Abandon)');

  if (gameId && playerIds.length >= 2) {
    // 两个玩家都触发 endgame（模拟放弃）
    for (let i = 0; i < 2; i++) {
      await test(`User ${i} triggers endgame for player ${playerIds[i]}`, async () => {
        const {status} = await req('POST', '/player/endgame', {
          userId: users[i].token,
          playerId: playerIds[i],
        });
        console.log(`    Status: ${status}`);
      });
    }

    // 等待一下让异步处理完成
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  // ─── 10. 检查排名（全员放弃场景：预期不变）───
  // 全员放弃(Phase.ABANDON) 时，设计上不更新排名，所以 mu/sigma/trueskill 应保持不变
  section('10. Check Rank After Game (Abandon = No Change)');

  for (let i = 0; i < Math.min(2, users.length); i++) {
    await test(`Rank unchanged for "${users[i].name}" after abandon`, async () => {
      const {status, data} = await req('GET', `/api/userrank?playerName=${users[i].name}`);
      assert(status === 200, `Expected 200, got ${status}`);

      const initial = initialRanks[i];
      const changed = data.mu !== initial.mu || data.sigma !== initial.sigma;

      console.log(`    Before: mu=${initial.mu.toFixed(2)} sigma=${initial.sigma.toFixed(2)} trueskill=${initial.trueskill.toFixed(2)}`);
      console.log(`    After:  mu=${data.mu.toFixed(2)} sigma=${data.sigma.toFixed(2)} trueskill=${data.trueskill.toFixed(2)}`);
      // 全员放弃时排名不应变化（符合设计）
      assert(!changed, `Expected rank unchanged after abandon, but mu/sigma changed`);
    });
  }

  // ─── 10b. 正常结束流程（需 TEST_API=true）───
  // 创建第二个天梯游戏，通过测试 API 强制正常结束，验证排名会更新
  let normalEndGameId = '';
  let normalEndPlayerIds: Array<string> = [];
  const ranksBeforeNormalEnd: Array<{mu: number, sigma: number, trueskill: number}> = [];

  if (process.env.TEST_API === 'true') {
    section('10b. Normal End Flow (Rank Update)');

    await test('Get current ranks before normal-end game', async () => {
      for (let i = 0; i < 2; i++) {
        const {status, data} = await req('GET', `/api/userrank?playerName=${users[i].name}`);
        assert(status === 200, `Expected 200, got ${status}`);
        ranksBeforeNormalEnd.push({mu: data.mu, sigma: data.sigma, trueskill: data.trueskill});
      }
      console.log(`    User0: mu=${ranksBeforeNormalEnd[0].mu.toFixed(2)} sigma=${ranksBeforeNormalEnd[0].sigma.toFixed(2)}`);
      console.log(`    User1: mu=${ranksBeforeNormalEnd[1].mu.toFixed(2)} sigma=${ranksBeforeNormalEnd[1].sigma.toFixed(2)}`);
    });

    await test('Create 2nd rank game for normal-end test', async () => {
      const gameConfig = {
        players: [
          {name: users[0].name, color: 'blue', beginner: false, handicap: 0, first: true},
          {name: users[1].name, color: 'red', beginner: false, handicap: 0, first: false},
        ],
        expansions: {
          corpera: true, prelude: false, prelude2: false, venus: false,
          colonies: false, turmoil: false, promo: false, breakthrough: false,
          eros: false, community: false, ares: false, moon: false,
          pathfinders: false, ceo: false, starwars: false, underworld: false,
          commission: false,
        },
        board: 'tharsis',
        seed: Math.random().toString(36).substring(7),
        randomFirstPlayer: false,
        undoOption: false,
        rankOption: true,
        showTimers: false,
        fastModeOption: false,
        showOtherPlayersVP: false,
        aresExtremeVariant: false,
        politicalAgendasExtension: 'Standard',
        solarPhaseOption: false,
        removeNegativeGlobalEventsOption: false,
        modularMA: 'Standard',
        draftVariant: false,
        initialDraft: false,
        preludeDraftVariant: false,
        ceosDraftVariant: false,
        startingCorporations: 2,
        startingCeos: 0,
        startingPreludes: 0,
        shuffleMapOption: false,
        randomMA: 'No randomization',
        includeFanMA: false,
        soloTR: false,
        customCorporationsList: [],
        bannedCards: [],
        includedCards: [],
        customColoniesList: [],
        customPreludes: [],
        customCeos: [],
        requiresMoonTrackCompletion: false,
        requiresVenusTrackCompletion: false,
        moonStandardProjectVariant: false,
        moonStandardProjectVariant1: false,
        altVenusBoard: false,
        heatFor: false,
        doubleCorp: false,
        initialCorpDraftVariant: false,
        userId: users[0].token,
      };
      const {status, data} = await req('POST', '/api/creategame', gameConfig);
      assert(status === 200, `Expected 200, got ${status}`);
      normalEndGameId = data.id;
      normalEndPlayerIds = data.players.map((p: any) => p.id);
      console.log(`    Game ID: ${normalEndGameId}`);
    });

    await test('Force normal end via test API', async () => {
      const {status, data} = await req('POST', '/api/v2/test/forceNormalRankEnd', {
        playerId: normalEndPlayerIds[0],
      });
      assert(status === 200, `Expected 200, got ${status}: ${JSON.stringify(data)}`);
      assert(data.ok === true, `Expected ok:true, got ${JSON.stringify(data)}`);
      console.log(`    Response: ${JSON.stringify(data)}`);
    });

    await test('Wait for async rank update', async () => {
      await new Promise((resolve) => setTimeout(resolve, 2500));
    });

    for (let i = 0; i < 2; i++) {
      await test(`Rank changed for "${users[i].name}" after normal end`, async () => {
        const {status, data} = await req('GET', `/api/userrank?playerName=${users[i].name}`);
        assert(status === 200, `Expected 200, got ${status}`);
        const before = ranksBeforeNormalEnd[i];
        const changed = data.mu !== before.mu || data.sigma !== before.sigma;
        console.log(`    Before: mu=${before.mu.toFixed(2)} sigma=${before.sigma.toFixed(2)} trueskill=${before.trueskill.toFixed(2)}`);
        console.log(`    After:  mu=${data.mu.toFixed(2)} sigma=${data.sigma.toFixed(2)} trueskill=${data.trueskill.toFixed(2)}`);
        assert(changed, `Expected rank to change after normal end (winner/loser), but mu/sigma unchanged`);
      });
    }
  } else {
    console.log('\n  (Skipping normal-end flow: set TEST_API=true to run)');
  }

  // ─── 11. 错误场景验证 ───
  section('11. Error Scenarios');

  await test('Join matchmaking without userId → 400', async () => {
    const {status} = await req('POST', '/api/v2/matchmaking/join', {});
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Season history without seasonId → 400', async () => {
    const {status} = await req('GET', '/api/v2/season/history');
    assert(status === 400, `Expected 400, got ${status}`);
  });

  await test('Non-existent v2 route → 404', async () => {
    const {status} = await req('GET', '/api/v2/nonexistent');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  await test('Register duplicate username → error', async () => {
    const {status} = await req('POST', '/api/register', {
      userName: users[0].name,
      password: 'testpass123',
    });
    assert(status === 500, `Expected 500 for duplicate, got ${status}`);
  });

  // ─── Summary ───
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  Results: ${passed} passed, ${failed} failed (${totalDuration}ms)`);
  console.log(`${'═'.repeat(50)}`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`  ✘ ${r.name}: ${r.error}`);
    });
  }

  console.log(`\nNote: Test users created with prefix "${TEST_PREFIX}" — clean up manually if needed.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
