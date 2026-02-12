/**
 * Capture Bun's native Response class before any other module can polyfill it.
 *
 * Some dependency in the project's import chain replaces globalThis.Response
 * with undici's _Response implementation. Bun.serve() performs an identity check
 * and rejects _Response objects. By importing this module first, we capture
 * the original native constructor.
 */
// eslint-disable-next-line no-undef
export const BunNativeResponse = globalThis.Response;
