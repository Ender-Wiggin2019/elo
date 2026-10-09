import {Phase} from '../../common/Phase';
import {normalizeUserId} from '../../common/utils/normalizeUserId';
import {StatsCardType} from '../../common/models/StatsModel';
import {CardName} from '../../common/cards/CardName';
import {CardManifest} from '../cards/ModuleManifest';
import {ALL_MODULE_MANIFESTS} from '../cards/AllManifests';
import {resolveCardName} from '../../common/cards/CardRenames';
import {GameNotFoundError, IDatabase} from '../database/IDatabase';
import {SerializedCard} from '../SerializedCard';
import {SerializedGame} from '../SerializedGame';
import {SerializedPlayer} from '../SerializedPlayer';
import {Score} from '../IGame';
import {StatsBackfillCursor, StatsGameFact, StatsLegacyResult} from './StatsTypes';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DAYS = 180;
const MAX_DAYS = 180;
const DEFAULT_MAX_GAMES = 200;
const MAX_GAMES = 2000;
const DEFAULT_BATCH_SIZE = 20;
const MAX_BATCH_SIZE = 50;
const DEFAULT_DELAY_MS = 25;

type LegacyScore = Score & {playerScore: number};

interface LegacyEntry {
  score: LegacyScore;
  accountId: string | null;
  name: string;
  index: number;
  archivedPlayer?: SerializedPlayer;
  archivedIndex?: number;
  megaCredits?: number;
  position: number;
}

interface CardSnapshot {
  cards: StatsGameFact['seats'][number]['cards'];
  complete: boolean;
}

export interface BackfillStatsOptions {
  days?: number;
  maxGames?: number;
  batchSize?: number;
  delayMs?: number;
  now?: number | Date;
  cursor?: StatsBackfillCursor;
}

export interface BackfillStatsResult {
  scanned: number;
  imported: number;
  skipped: number;
  failed: number;
  cursor?: StatsBackfillCursor;
  hasMore: boolean;
}

const CARD_TYPES = buildCardTypes();

/**
 * Convert one legacy game_results row into an analytics fact.
 *
 * Legacy results contain authoritative scores, while an archived game may
 * contain the final tableau and the money tie-break state. This function never
 * deserializes the game or recomputes VP, so old results remain stable when
 * current card rules change.
 */
export function collectLegacyStats(
  result: StatsLegacyResult,
  serialized?: SerializedGame,
): StatsGameFact | undefined {
  const base = validateLegacyResult(result);
  if (base === undefined) {
    return undefined;
  }

  if (serialized !== undefined) {
    if (serialized.id !== result.gameId || serialized.phase !== Phase.END) {
      return undefined;
    }
    return collectWithArchive(result, serialized, base);
  }

  return collectWithoutArchive(result, base);
}

/**
 * Import a bounded window of old game results. This is deliberately an
 * explicit maintenance operation; callers choose when to run it.
 */
export async function backfillStats(
  database: IDatabase,
  options: BackfillStatsOptions = {},
): Promise<BackfillStatsResult> {
  const settings = normalizeOptions(options);
  const since = formatDatabaseTimestamp(settings.now - settings.days * DAY_MS);
  const repository = database.getStatsRepository();
  let cursor = options.cursor;
  let scanned = 0;
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  let hasMore = false;

  while (scanned < settings.maxGames) {
    const requested = Math.min(settings.batchSize, settings.maxGames - scanned);
    const batch = await database.getStatsBackfillBatch(since, cursor, requested);
    if (batch.length === 0) {
      hasMore = false;
      break;
    }

    const rows = batch.slice(0, requested);
    for (const result of rows) {
      scanned++;
      cursor = {createdAt: result.createdAt, gameId: result.gameId};

      let serialized: SerializedGame | undefined;
      try {
        serialized = await database.getGame(result.gameId);
      } catch (error) {
        if (!isGameNotFoundError(error)) {
          failed++;
          throw error;
        }
      }

      const fact = collectLegacyStats(result, serialized);
      if (fact === undefined) {
        skipped++;
      } else {
        try {
          await repository.save(fact);
          imported++;
        } catch (_error) {
          failed++;
          // Keep logs free of account identifiers and database error payloads.
          console.warn(`[stats backfill] failed to save ${result.gameId}`);
        }
      }

      await delay(settings.delayMs);
    }

    if (rows.length < requested || batch.length > rows.length) {
      hasMore = batch.length > rows.length;
      break;
    }
    if (scanned >= settings.maxGames) {
      // We intentionally do not read one extra row just to prove exhaustion.
      hasMore = true;
      break;
    }
  }

  return {scanned, imported, skipped, failed, cursor, hasMore};
}

function collectWithArchive(
  result: StatsLegacyResult,
  serialized: SerializedGame,
  base: BaseLegacyFact,
): StatsGameFact | undefined {
  const archivedPlayers = [
    ...(Array.isArray(serialized.players) ? serialized.players : []),
    ...(Array.isArray(serialized.exitedPlayers) ? serialized.exitedPlayers : []),
  ];
  if (archivedPlayers.length !== base.players || archivedPlayers.length !== result.scores.length) {
    return undefined;
  }

  const entries = matchScoresToArchive(result.scores, archivedPlayers);
  if (entries === undefined || !applyOutcomes(entries, result.outcomes, base.players)) {
    return undefined;
  }

  const positions = new Set<number>();
  for (const entry of entries) {
    if (entry.position === undefined || positions.has(entry.position)) {
      return undefined;
    }
    positions.add(entry.position);
  }
  if (positions.size !== base.players || [...positions].some((position) => position < 1 || position > base.players)) {
    return undefined;
  }

  let cardsComplete = true;
  const seats = entries.map((entry, seat) => {
    const snapshot = collectArchivedCards(entry.archivedPlayer);
    cardsComplete &&= snapshot.complete;
    return {
      seat,
      accountId: entry.accountId,
      score: entry.score.playerScore,
      position: entry.position,
      won: entry.position === 1,
      scoreParts: null,
      cards: snapshot.cards,
    };
  });

  return {
    ...base.fact,
    cardsComplete,
    seats,
  };
}

function collectWithoutArchive(
  result: StatsLegacyResult,
  base: BaseLegacyFact,
): StatsGameFact | undefined {
  const entries: Array<LegacyEntry> = [];
  const accountIds = new Set<string>();
  for (const [index, score] of result.scores.entries()) {
    const accountId = accountIdFor(score.userId);
    const name = stringValue(score.player);
    if (!Number.isFinite(score.playerScore) || accountId === null || name === undefined || accountIds.has(accountId)) {
      return undefined;
    }
    accountIds.add(accountId);
    entries.push({score, accountId, name, index, position: 0});
  }
  if (!applyOutcomes(entries, result.outcomes, base.players)) {
    return undefined;
  }

  const positions = new Set(entries.map((entry) => entry.position));
  if (positions.size !== base.players || [...positions].some((position) => position === undefined || position < 1 || position > base.players)) {
    return undefined;
  }

  return {
    ...base.fact,
    cardsComplete: false,
    seats: entries.map((entry, seat) => ({
      seat,
      accountId: entry.accountId,
      score: entry.score.playerScore,
      position: entry.position,
      won: entry.position === 1,
      scoreParts: null,
      cards: [],
    })),
  };
}

function matchScoresToArchive(
  scores: Array<Score>,
  archivedPlayers: Array<SerializedPlayer>,
): Array<LegacyEntry> | undefined {
  const used = new Set<number>();
  const entries: Array<LegacyEntry> = [];
  const guestNames = new Set<string>();

  for (const [index, rawScore] of scores.entries()) {
    const score = rawScore as LegacyScore;
    if (!Number.isFinite(score.playerScore)) {
      return undefined;
    }
    const name = stringValue(score.player);
    if (name === undefined || name.trim() === '') {
      return undefined;
    }

    const accountId = accountIdFor(score.userId);
    let candidates: Array<[SerializedPlayer, number]>;
    if (accountId !== null) {
      candidates = archivedPlayers.flatMap((player, archivedIndex) => {
        const playerAccountId = accountIdFor(player.userId);
        return playerAccountId === accountId ? [[player, archivedIndex]] : [];
      });
    } else {
      if (guestNames.has(name)) {
        return undefined;
      }
      guestNames.add(name);
      candidates = archivedPlayers.flatMap((player, archivedIndex) => {
        const playerAccountId = accountIdFor(player.userId);
        return playerAccountId === null && player.name === name ? [[player, archivedIndex]] : [];
      });
    }

    if (candidates.length !== 1) {
      return undefined;
    }
    const [archivedPlayer, archivedIndex] = candidates[0];
    if (used.has(archivedIndex) || !Number.isFinite(archivedPlayer.megaCredits)) {
      return undefined;
    }
    used.add(archivedIndex);
    entries.push({
      score,
      accountId,
      name,
      index,
      archivedPlayer,
      archivedIndex,
      megaCredits: archivedPlayer.megaCredits,
      position: 0,
    });
  }

  if (used.size !== archivedPlayers.length) {
    return undefined;
  }

  // Match Game.getSortedPlayers: score, then money, descending. The final
  // roster index keeps equal values deterministic in the same reverse order.
  const ranked = entries.slice().sort((a, b) => {
    if (a.score.playerScore !== b.score.playerScore) {
      return a.score.playerScore - b.score.playerScore;
    }
    if (a.megaCredits !== b.megaCredits) {
      return (a.megaCredits ?? 0) - (b.megaCredits ?? 0);
    }
    return (a.archivedIndex ?? 0) - (b.archivedIndex ?? 0);
  }).reverse();
  ranked.forEach((entry, position) => {
    entry.position = position + 1;
  });
  return entries;
}

function applyOutcomes(
  entries: Array<LegacyEntry>,
  outcomes: StatsLegacyResult['outcomes'],
  playerCount: number,
): boolean {
  if (!Array.isArray(outcomes)) {
    return false;
  }

  const byAccount = new Map<string, LegacyEntry>();
  for (const entry of entries) {
    if (entry.accountId !== null) {
      byAccount.set(entry.accountId, entry);
    }
  }
  const seenAccounts = new Set<string>();
  const seenPositions = new Set<number>();
  for (const outcome of outcomes) {
    const accountId = accountIdFor(outcome?.accountId);
    const position = outcome?.position;
    if (
      accountId === null ||
      outcome.phase !== Phase.END ||
      !Number.isInteger(position) ||
      position < 1 ||
      position > playerCount ||
      seenAccounts.has(accountId) ||
      seenPositions.has(position)
    ) {
      return false;
    }
    const entry = byAccount.get(accountId);
    if (entry === undefined) {
      return false;
    }
    entry.position = position;
    seenAccounts.add(accountId);
    seenPositions.add(position);
  }

  // Older casual games did not always persist user outcomes. A confirmed END
  // archive still supplies the complete money tie-break; without it we require
  // an authoritative outcome for every seat.
  for (const entry of entries) {
    if (entry.accountId !== null && !seenAccounts.has(entry.accountId) && !entry.archivedPlayer) {
      return false;
    }
  }
  return true;
}

function collectArchivedCards(player: SerializedPlayer | undefined): CardSnapshot {
  if (player === undefined) {
    return {cards: [], complete: false};
  }

  let complete = true;
  const cards: CardSnapshot['cards'] = [];
  const seen = new Set<string>();
  const playedCards = (player as SerializedPlayer & {playedCards?: Array<SerializedCard | string>}).playedCards;
  if (!Array.isArray(playedCards)) {
    complete = false;
  }
  const corporations = (player as SerializedPlayer & {corporations?: Array<SerializedCard | string>}).corporations;
  if (corporations !== undefined && !Array.isArray(corporations)) {
    complete = false;
  }

  for (const serializedCard of [
    ...(Array.isArray(playedCards) ? playedCards : []),
    ...(Array.isArray(corporations) ? corporations : []),
  ]) {
    const rawName = typeof serializedCard === 'string' ? serializedCard : serializedCard?.name;
    const name = stringValue(rawName);
    if (name === undefined || name.trim() === '') {
      complete = false;
      continue;
    }
    let canonicalName: string;
    try {
      canonicalName = String(resolveCardName(name as CardName));
    } catch (_error) {
      complete = false;
      continue;
    }
    if (seen.has(canonicalName)) {
      continue;
    }
    seen.add(canonicalName);
    const type = CARD_TYPES.get(canonicalName);
    if (type === undefined) {
      complete = false;
      continue;
    }
    cards.push({name: canonicalName, type, vp: null});
  }

  return {cards, complete};
}

interface BaseLegacyFact {
  players: number;
  fact: Omit<StatsGameFact, 'cardsComplete' | 'seats'>;
}

function validateLegacyResult(result: StatsLegacyResult): BaseLegacyFact | undefined {
  if (
    result === undefined ||
    typeof result.gameId !== 'string' ||
    result.gameId.trim() === '' ||
    typeof result.createdAt !== 'string' ||
    !Array.isArray(result.scores) ||
    !Array.isArray(result.outcomes) ||
    !Number.isInteger(result.players) ||
    result.players < 2 ||
    result.scores.length !== result.players ||
    typeof result.gameOptions !== 'object' ||
    result.gameOptions === null
  ) {
    return undefined;
  }
  const endedAt = new Date(result.createdAt).getTime();
  if (!Number.isFinite(endedAt) || !Number.isFinite(result.generations)) {
    return undefined;
  }
  const board = result.gameOptions.boardName;
  if (typeof board !== 'string' || board.trim() === '') {
    return undefined;
  }

  return {
    players: result.players,
    fact: {
      gameId: result.gameId,
      endedAt,
      day: new Date(endedAt).toISOString().slice(0, 10),
      players: result.players,
      generations: result.generations,
      ranked: result.gameOptions.rankOption === true,
      board,
    },
  };
}

function buildCardTypes(): Map<string, StatsCardType> {
  const types = new Map<string, StatsCardType>();
  for (const moduleManifest of ALL_MODULE_MANIFESTS) {
    registerManifest(types, moduleManifest.corporationCards, 'corporation');
    registerManifest(types, moduleManifest.preludeCards, 'prelude');
    registerManifest(types, moduleManifest.ceoCards, 'ceo');
    registerManifest(types, moduleManifest.projectCards, 'project');
  }
  return types;
}

function registerManifest(
  types: Map<string, StatsCardType>,
  manifest: Parameters<typeof CardManifest.keys>[0],
  type: StatsCardType,
): void {
  for (const name of CardManifest.keys(manifest)) {
    const canonicalName = String(resolveCardName(name));
    if (!types.has(canonicalName)) {
      types.set(canonicalName, type);
    }
  }
}

function accountIdFor(value: unknown): string | null {
  const id = stringValue(value);
  return id === undefined || id === '' ? null : normalizeUserId(id);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value;
  }
  if (value instanceof String) {
    return value.toString();
  }
  return undefined;
}

function isGameNotFoundError(error: unknown): boolean {
  return error instanceof GameNotFoundError || (typeof error === 'object' && error !== null && (error as {name?: unknown}).name === 'GameNotFoundError');
}

function normalizeOptions(options: BackfillStatsOptions): {days: number; maxGames: number; batchSize: number; delayMs: number; now: number} {
  const now = options.now instanceof Date ? options.now.getTime() : options.now ?? Date.now();
  return {
    days: clampInteger(options.days ?? DEFAULT_DAYS, 1, MAX_DAYS),
    maxGames: clampInteger(options.maxGames ?? DEFAULT_MAX_GAMES, 0, MAX_GAMES),
    batchSize: clampInteger(options.batchSize ?? DEFAULT_BATCH_SIZE, 1, MAX_BATCH_SIZE),
    delayMs: clampInteger(options.delayMs ?? DEFAULT_DELAY_MS, 0, Number.MAX_SAFE_INTEGER),
    now: Number.isFinite(now) ? now : Date.now(),
  };
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function formatDatabaseTimestamp(value: number): string {
  // game_results uses a naive timestamp column with second precision. Keep
  // the range value in that same lexical format; cursors retain the exact
  // database string returned for each row.
  return new Date(value).toISOString().slice(0, 19).replace('T', ' ');
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
