import 'dotenv/config';
import fs from 'fs';
import {Database} from '../database/Database';
import {SQLite} from '../database/SQLite';
import {backfillStats} from '../stats/backfillStats';
import {StatsBackfillCursor} from '../stats/StatsTypes';

async function main(): Promise<number> {
  const args = process.argv.slice(2).filter((arg) => arg !== '--');
  if (args.includes('--help')) {
    console.log('Backfill statistics from completed archives (no game replay).\n' +
      'Options: --days 180 --max-games 200 --batch-size 20 --delay-ms 25\n' +
      '         --cursor-file ./db/stats-backfill-cursor.json\n' +
      '         --sqlite /absolute/path/to/game.db (otherwise uses server DB configuration)\n' +
      'Run repeatedly while hasMore is true. Omit cursor-file to retry failed/skipped rows.');
    return 0;
  }
  const options = new Map<string, string>();
  const allowed = ['--days', '--max-games', '--batch-size', '--delay-ms', '--cursor-file', '--sqlite'];
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.includes(args[i]) || !args[i + 1] || options.has(args[i])) {
      throw new Error('Invalid or duplicate command option. Use --help.');
    }
    options.set(args[i], args[i + 1]);
  }
  const numberOption = (key: string): number | undefined => {
    const value = options.get(key);
    if (value === undefined) {
      return undefined;
    }
    if (!/^\d+$/.test(value)) {
      throw new Error(`${key} requires an integer`);
    }
    return Number(value);
  };
  const cursorPath = options.get('--cursor-file');
  let cursor: StatsBackfillCursor | undefined;
  if (cursorPath && fs.existsSync(cursorPath)) {
    cursor = JSON.parse(fs.readFileSync(cursorPath, 'utf8'));
    if (!cursor || typeof cursor.createdAt !== 'string' || typeof cursor.gameId !== 'string' || !Number.isFinite(Date.parse(cursor.createdAt))) {
      throw new Error('Invalid cursor file');
    }
  }
  const sqlitePath = options.get('--sqlite');
  if (sqlitePath && !fs.existsSync(sqlitePath)) {
    throw new Error('SQLite source file does not exist');
  }
  const database = sqlitePath ? new SQLite(sqlitePath) : Database.getInstance();
  await database.initialize();
  const result = await backfillStats(database, {
    days: numberOption('--days'), maxGames: numberOption('--max-games'), batchSize: numberOption('--batch-size'),
    delayMs: numberOption('--delay-ms'), cursor,
  });
  // Do not move a persisted cursor past failed writes: rerunning safely retries
  // them, while the source reader skips already imported games.
  if (cursorPath && result.cursor && result.failed === 0) {
    fs.writeFileSync(cursorPath + '.tmp', JSON.stringify(result.cursor));
    fs.renameSync(cursorPath + '.tmp', cursorPath);
  }
  console.log(JSON.stringify(result, null, 2));
  return result.failed > 0 ? 1 : 0;
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error('[stats backfill]', err instanceof Error ? err.message : 'Import failed');
  process.exit(1);
});
