import {Worker} from 'worker_threads';
import {StatsQuery, StatsSqlParam} from './StatsRepository';

// This is plain JavaScript so the same worker runs from tsx and the compiled
// server. Only analytics SELECTs and read-transaction control reach this worker.
const WORKER_SOURCE = `
const {parentPort, workerData} = require('worker_threads');
const SQLite = require(workerData.modulePath);
const db = new SQLite(workerData.filename, {readonly: true, timeout: 2000});
db.pragma('query_only = ON');
parentPort.on('message', ({id, sql, params}) => {
  try {
    const values = [];
    const text = sql.replace(/\\$(\\d+)/g, (_, index) => {
      values.push(params[Number(index) - 1]);
      return '?';
    });
    const statement = db.prepare(text);
    const rows = statement.reader ? statement.all(values) : (statement.run(values), []);
    parentPort.postMessage({id, rows});
  } catch (error) {
    parentPort.postMessage({id, error: error.message});
  }
});
`;

/** A single queued analytics connection keeps heavy SQLite work off the game loop. */
export class StatsSqliteReader {
  private worker: Worker | undefined;
  private nextId = 0;
  private tail: Promise<unknown> = Promise.resolve();
  private pending = new Map<number, {resolve: (rows: any[]) => void; reject: (err: Error) => void}>();

  constructor(private readonly filename: string, private readonly timeoutMs: number = 15_000) {}

  readTransaction<T>(work: (query: StatsQuery) => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      // The deadline covers the whole snapshot. Terminating a worker interrupts
      // a runaway query and releases its read transaction; the next call recovers.
      const timer = setTimeout(() => this.stop(new Error('Statistics query timed out')), this.timeoutMs);
      try {
        await this.query('BEGIN');
        const value = await work({query: (sql, params) => this.query(sql, params)});
        await this.query('COMMIT');
        return value;
      } catch (err) {
        if (this.worker) {
          await this.query('ROLLBACK').catch(() => undefined);
        }
        throw err;
      } finally {
        clearTimeout(timer);
      }
    });
    this.tail = result.catch(() => undefined);
    return result;
  }

  private query(sql: string, params: StatsSqlParam[] = []): Promise<any[]> {
    if (!this.worker) {
      const worker = new Worker(WORKER_SOURCE, {
        eval: true,
        workerData: {filename: this.filename, modulePath: require.resolve('better-sqlite3')},
      });
      this.worker = worker;
      worker.on('message', (message: {id: number; rows: any[]; error?: string}) => {
        const pending = this.pending.get(message.id);
        if (!pending) {
          return;
        }
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error));
        } else {
          pending.resolve(message.rows);
        }
        if (this.pending.size === 0) {
          worker.unref();
        }
      });
      worker.on('error', (err) => {
        if (this.worker === worker) {
          this.stop(err instanceof Error ? err : new Error(String(err)));
        }
      });
      worker.on('exit', () => {
        if (this.worker === worker) {
          this.stop(new Error('Statistics reader stopped'));
        }
      });
      worker.unref();
    }
    const id = ++this.nextId;
    this.worker.ref();
    return new Promise((resolve, reject) => {
      this.pending.set(id, {resolve, reject});
      this.worker?.postMessage({id, sql, params});
    });
  }

  /** Used on timeout and by file-database integration tests. */
  stop(error: Error = new Error('Statistics reader closed')): void {
    const worker = this.worker;
    this.worker = undefined;
    void worker?.terminate();
    for (const pending of this.pending.values()) {
      pending.reject(error);
    }
    this.pending.clear();
  }
}
