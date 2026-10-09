import BetterSqlite3 = require('better-sqlite3');
import {StatsQuery, StatsSql} from './StatsRepository';

/** Serialize this module's reads/writes so async transactions cannot interleave. */
export function statsSqliteAdapter(db: BetterSqlite3.Database): StatsSql {
  let tail: Promise<unknown> = Promise.resolve();
  function exclusive<T>(work: () => Promise<T>): Promise<T> {
    const next = tail.then(work);
    tail = next.catch(() => undefined);
    return next;
  }
  const query: StatsQuery['query'] = (sql, params = []) => {
    const values: Array<string | number | null> = [];
    const statement = db.prepare(sql.replace(/\$(\d+)/g, (_, index: string) => {
      values.push(params[Number(index) - 1]);
      return '?';
    }));
    if (statement.reader) {
      return Promise.resolve(statement.all(values) as any[]);
    }
    statement.run(values);
    return Promise.resolve([]);
  };
  function transaction<T>(work: (query: StatsQuery) => Promise<T>, readOnly: boolean): Promise<T> {
    return exclusive(async () => {
      db.exec(readOnly ? 'BEGIN' : 'BEGIN IMMEDIATE');
      try {
        const result = await work({query});
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    });
  }
  return {
    query: (sql, params) => exclusive(() => query(sql, params)),
    transaction: (work) => transaction(work, false),
    readTransaction: (work) => transaction(work, true),
  };
}
