import {BoardName} from '../boards/BoardName';
import {RandomMAOptionType} from '../ma/RandomMAOptionType';
import {AgendaStyle} from '../turmoil/Types';
import {CardName} from '../cards/CardName';

export interface GameOptionsModel_ {
  aresExtension: boolean,
  altVenusBoard: boolean,
  boardName: BoardName,
  bannedCards: Array<CardName>;
  ceoExtension: boolean,
  coloniesExtension: boolean,
  communityCardsOption: boolean,
  corporateEra: boolean,
  draftVariant: boolean,
  _corporationsDraft: boolean, // NOT
  escapeVelocityMode: boolean,
  escapeVelocityThreshold?: number,
  escapeVelocityPeriod?: number,
  escapeVelocityPenalty?: number,
  fastModeOption: boolean,
  includeFanMA: boolean,
  includeVenusMA: boolean,
  initialDraftVariant: boolean,
  moonExpansion: boolean,
  pathfindersExpansion: boolean,
  preludeExtension: boolean,
  promoCardsOption: boolean,
  politicalAgendasExtension: AgendaStyle,
  removeNegativeGlobalEventsOption: boolean,
  showOtherPlayersVP: boolean,
  showTimers: boolean,
  shuffleMapOption: boolean,
  solarPhaseOption: boolean,
  soloTR: boolean,
  randomMA: RandomMAOptionType,
  requiresMoonTrackCompletion: boolean,
  requiresVenusTrackCompletion: boolean,
  turmoilExtension: boolean,
  twoCorpsVariant: boolean,
  venusNextExtension: boolean,
  undoOption: boolean,
}
