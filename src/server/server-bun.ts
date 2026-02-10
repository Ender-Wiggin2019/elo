/**
 * Bun-native HTTP server with hot-reload support.
 *
 * Uses Bun.serve() instead of Node.js http.createServer().
 * When run with `bun --hot run`, only the fetch handler is re-evaluated
 * on file changes — the process stays alive, DB/GameLoader stay in memory,
 * and the TCP socket is preserved. This gives near-instant hot-reload.
 *
 * Usage:
 *   bun --hot run src/server/server-bun.ts
 */

// CRITICAL: Import this FIRST — it captures Bun's native Response before
// any other dependency can polyfill globalThis.Response with undici's _Response.
// Bun.serve() performs an identity check and rejects non-native Response objects.
import {BunNativeResponse} from './bun-native-response';

/* eslint-disable no-var */
declare var Bun: {
  serve(options: {
    port: number;
    fetch(req: Request): Promise<Response> | Response;
  }): void;
};
/* eslint-enable no-var */

require('dotenv').config();
require('console-stamp')(
  console,
  {format: ':date(yyyy-mm-dd HH:MM:ss Z)'},
);

import * as raw_settings from '../genfiles/settings.json';
import {processRequest} from './server/requestProcessor';
import {GameLoader} from './database/GameLoader';
import {globalInitialize} from './globalInitialize';
import {serverId, runId} from './utils/server-ids';
import type {Request as TfmRequest} from './Request';
import type {Response as TfmResponse} from './Response';
import {app as honoApp} from './hono/app';

// =====================================================
// Initialization — runs once, survives hot-reloads
// =====================================================
globalInitialize();

const port = Number(process.env.PORT) || 8081;

// =====================================================
// Adapter: Convert Web Request/Response <-> TFM types
// =====================================================

/**
 * Wrap a Web API Request into the TfmRequest shape
 * that processRequest() expects.
 *
 * The existing code uses a pattern like:
 *   req.on('data', (chunk) => body += chunk.toString());
 *   req.once('end', () => { process(JSON.parse(body)); });
 *
 * We pre-read the entire body, then emit data/end synchronously in a microtask.
 */
async function adaptRequest(webReq: Request): Promise<TfmRequest> {
  const url = new URL(webReq.url);

  // Pre-read the full body
  const bodyBuffer = webReq.body ?
    Buffer.from(await webReq.arrayBuffer()) :
    Buffer.alloc(0);

  // Build headers object matching Node.js IncomingMessage.headers format
  const headers: Record<string, string> = {};
  webReq.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });
  if (!headers['host']) {
    headers['host'] = url.host;
  }

  // Callbacks registered by the consuming code
  let dataCallback: ((dat: Buffer) => void) | null = null;
  let endCallback: (() => void) | null = null;

  const tfmReq: TfmRequest = {
    headers,
    method: webReq.method || 'GET',
    url: url.pathname + url.search,
    on(_type: 'data', func: (dat: Buffer) => void) {
      dataCallback = func;
      scheduleEmit();
    },
    once(_type: 'end', func: () => void) {
      endCallback = func;
      scheduleEmit();
    },
    socket: {
      address() {
        const forwarded = headers['x-forwarded-for'];
        const addr = forwarded ? forwarded.split(',')[0].trim() : '0.0.0.0';
        return {address: addr, family: 'IPv4', port: 0};
      },
    },
  };

  let emitScheduled = false;
  function scheduleEmit() {
    if (emitScheduled) return;
    if (endCallback !== null) {
      emitScheduled = true;
      queueMicrotask(() => {
        if (bodyBuffer.length > 0 && dataCallback) {
          dataCallback(bodyBuffer);
        }
        if (endCallback) endCallback();
      });
    }
  }

  return tfmReq;
}

/**
 * Collected response data from the TFM response adapter.
 * We collect raw data instead of creating a Response object
 * to avoid Bun's Response class identity issues.
 */
interface ICollectedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer | null;
}

/**
 * Create a TfmResponse that collects written data and headers.
 * Resolves with raw data when end() is called.
 * The caller creates the actual Bun Response in the fetch scope.
 */
function adaptResponse(): {tfmRes: TfmResponse; dataPromise: Promise<ICollectedResponse>} {
  const chunks: (string | Buffer)[] = [];
  let statusCode = 200;
  const responseHeaders: Record<string, string> = {};
  let resolveData: (data: ICollectedResponse) => void;

  const dataPromise = new Promise<ICollectedResponse>((resolve) => {
    resolveData = resolve;
  });

  const tfmRes: TfmResponse = {
    setHeader(name: string, value: string | number | readonly string[]) {
      responseHeaders[name.toLowerCase()] = String(value);
      return tfmRes as any;
    },
    writeHead(code: number, _headers?: any) {
      statusCode = code;
      if (_headers && typeof _headers === 'object') {
        for (const [k, v] of Object.entries(_headers)) {
          responseHeaders[k.toLowerCase()] = String(v);
        }
      }
      return tfmRes as any;
    },
    write(data: string | Buffer) {
      chunks.push(data);
      return true;
    },
    end(data?: string | Buffer) {
      if (data) chunks.push(data);
      const body = chunks.length > 0 ?
        Buffer.concat(chunks.map((c) => typeof c === 'string' ? Buffer.from(c) : c)) :
        null;
      resolveData({statusCode, headers: responseHeaders, body});
    },
  };

  return {tfmRes, dataPromise};
}

// =====================================================
// Server startup
// =====================================================

let serverStarted = false;

GameLoader.getInstance().start(() => {
  if (serverStarted) return;
  serverStarted = true;

  console.log(`Starting ${raw_settings.head}, built at ${raw_settings.builtAt}`);
  console.log('Starting Bun server on port ' + port);

  Bun.serve({
    port,
    async fetch(req: Request): Promise<Response> {
      const url = new URL(req.url);

      // Route /api/v2/* directly to Hono (native Web API)
      if (url.pathname.startsWith('/api/v2/')) {
        const honoResp = await honoApp.fetch(req);
        // Re-create as a native Bun Response (not undici's _Response)
        const respHeaders: Record<string, string> = {};
        honoResp.headers.forEach((v: string, k: string) => {
          respHeaders[k] = v;
        });
        return new BunNativeResponse(await honoResp.arrayBuffer(), {
          status: honoResp.status,
          statusText: honoResp.statusText,
          headers: respHeaders,
        });
      }

      // For all other routes, adapt to the existing TFM request processor
      const tfmReq = await adaptRequest(req);
      const {tfmRes, dataPromise} = adaptResponse();

      try {
        processRequest(tfmReq, tfmRes);
      } catch (error) {
        return new BunNativeResponse('Internal Server Error', {status: 500});
      }

      // Wait for the async handler to call end(), then create Response in this scope
      const collected = await dataPromise;
      const bodyInit = collected.body ? new Uint8Array(collected.body) : null;
      return new BunNativeResponse(bodyInit, {
        status: collected.statusCode,
        headers: collected.headers,
      });
    },
  });

  if (!process.env.SERVER_ID) {
    console.log(`The secret serverId for this server is ${serverId}.`);
    console.log(`Administrative routes can be found at admin?id=${serverId}`);
  }
  console.log(`The public run ID is ${runId}`);
  console.log('Bun server is ready. (Hot-reload enabled with --hot)');

  // Season check
  import('./rank/SeasonResetHandler').then(({checkAndResetSeason}) => {
    checkAndResetSeason().catch((err: any) => {
      console.error('[Season] Error during season check:', err);
    });
  });
});
