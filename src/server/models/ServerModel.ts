import {CardModel} from '../../common/models/CardModel';
import {Color} from '../../common/Color';
import {IGame} from '../IGame';
import {GameOptions} from '../game/GameOptions';
import {SimpleGameModel} from '../../common/models/SimpleGameModel';
import {Board} from '../boards/Board';
import {Space} from '../boards/Space';
import {IPlayer} from '../IPlayer';
import {PlayerInput} from '../PlayerInput';
import {PlayerInputModel} from '../../common/models/PlayerInputModel';
import {PlayerBlockModel, PlayerViewModel, Protection, PublicPlayerModel} from '../../common/models/PlayerModel';
import {SpaceHighlight, SpaceModel} from '../../common/models/SpaceModel';
import {TileType} from '../../common/TileType';
import {Resource} from '../../common/Resource';
import {ClaimedMilestoneModel, MilestoneScore} from '../../common/models/ClaimedMilestoneModel';
import {FundedAwardModel, AwardScore} from '../../common/models/FundedAwardModel';
import {getTurmoilModel} from '../models/TurmoilModel';
import {GameLoader} from '../database/GameLoader';
import {SpectatorModel} from '../../common/models/SpectatorModel';
import {GameModel} from '../../common/models/GameModel';
import {TurmoilUtil} from '../turmoil/TurmoilUtil';
import {createPathfindersModel} from './PathfindersModel';
import {MoonExpansion} from '../moon/MoonExpansion';
import {MoonModel} from '../../common/models/MoonModel';
import {CardName} from '../../common/cards/CardName';
import {AwardScorer} from '../awards/AwardScorer';
import {SpaceId} from '../../common/Types';
import {cardsToModel, coloniesToModel} from './ModelUtils';
import {runId} from '../utils/server-ids';
import {Tag} from '../../common/cards/Tag';
import {Units} from '../../common/Units';
import {isICloneTagCard} from '../cards/pathfinders/ICloneTagCard';
import {toName} from '../../common/utils/utils';
import {MAX_AWARDS, MAX_MILESTONES} from '../../common/constants';
import {GameOptionsModel} from '../../common/models/GameOptionsModel';
import {Phase} from '../../common/Phase';

export class Server {
  public static getSimpleGameModel(game: IGame, userId : string = ''): SimpleGameModel {
    const user = GameLoader.getInstance().userIdMap.get(userId);
    return {
      activePlayer: game.activePlayer.color,
      id: game.id,
      phase: game.phase,
      players: game.getAllPlayers().map((player) => {
        return {
          id: player.id,
          name: player.name,
          color: player.exited? 'gray' : player.color,
        };
      }),
      spectatorId: game.spectatorId,
      createtime: game.createtime?.slice(5, 16),
      updatetime: game.updatetime?.slice(5, 16),
      gameAge: game.gameAge,
      saveId: game.lastSaveId,
      rollback: user && user.canRollback(),
      rollbackNum: user && user.getRollbackNum(),
      delete: user && user.canDelete(),
      gameOptions: this.getGameOptionsAsModel(game.gameOptions),
      lastSoloGeneration: game.lastSoloGeneration(),
      heatFor: game.gameOptions.heatFor,
      breakthrough: game.gameOptions.breakthrough,
      expectedPurgeTimeMs: game.expectedPurgeTimeMs(),
    };
  }

  public static getGameModel(game: IGame): GameModel {
    const turmoil = getTurmoilModel(game);

    return {
      aresData: game.aresData,
      awards: this.getAwards(game),
      colonies: coloniesToModel(game, game.colonies, false, true),
      deckSize: game.projectDeck.drawPile.length,
      discardedColonies: game.discardedColonies.map(toName),
      expectedPurgeTimeMs: game.expectedPurgeTimeMs(),
      gameAge: game.gameAge,
      gameOptions: this.getGameOptionsAsModel(game.gameOptions),
      generation: game.getGeneration(),
      globalsPerGeneration: game.gameIsOver() ? game.globalsPerGeneration : [],
      isSoloModeWin: game.isSoloModeWin(),
      isTerraformed: game.marsIsTerraformed(),
      lastSoloGeneration: game.lastSoloGeneration(),
      milestones: this.getMilestones(game),
      moon: this.getMoonModel(game),
      oceans: game.board.getOceanSpaces().length,
      oxygenLevel: game.getOxygenLevel(),
      passedPlayers: game.getPassedPlayers(),
      pathfinders: createPathfindersModel(game),
      phase: game.phase,
      spaces: this.getSpaces(game.board, game.gagarinBase, game.stJosephCathedrals, game.nomadSpace),
      spectatorId: game.spectatorId,
      temperature: game.getTemperature(),
      tags: game.tags,
      turmoil: turmoil,
      undoCount: game.undoCount,
      venusScaleLevel: game.getVenusScaleLevel(),
      step: game.lastSaveId,
      quitPlayers: game.getQuitPlayers(),
    };
  }

  public static getPlayerModel(player: IPlayer, playerBlockModel: PlayerBlockModel): PlayerViewModel {
    const game = player.game;
    const block = playerBlockModel.block;
    const isme = playerBlockModel.isme;
    const showhandcards = playerBlockModel.showhandcards;
    try {
      const user = GameLoader.getUserByPlayer(player);
      const userName = user ? user.name : '';
      const players: Array<PublicPlayerModel> = game.getAllPlayers().map((p) => Server.getPlayer(p, p.id === player.id));
      const thisPlayerIndex = players.findIndex((p) => p.color === player.color);
      const thisPlayer: PublicPlayerModel = players[thisPlayerIndex];

      const rv: PlayerViewModel = {
        cardsInHand: (block && !showhandcards ) ? [] : cardsToModel(player, player.cardsInHand, {showCalculatedCost: true}),
        ceoCardsInHand: cardsToModel(player, player.ceoCardsInHand),
        dealtCorporationCards: block? []:cardsToModel(player, player.dealtCorporationCards),
        dealtPreludeCards: block? []:cardsToModel(player, player.dealtPreludeCards),
        dealtCeoCards: cardsToModel(player, player.dealtCeoCards),
        dealtProjectCards: block? []:cardsToModel(player, player.dealtProjectCards),
        draftedCards: block? []:cardsToModel(player, player.draftedCards, {showCalculatedCost: true}),
        game: this.getGameModel(player.game),
        id: player.id,
        runId: runId,
        pickedCorporationCard: block? []:player.pickedCorporationCard ? cardsToModel(player, [player.pickedCorporationCard]) : [],
        pickedCorporationCard2: block? []:player.pickedCorporationCard2 ? cardsToModel(player, [player.pickedCorporationCard2]) : [],

        preludeCardsInHand: block? []:cardsToModel(player, player.preludeCardsInHand),
        thisPlayer: thisPlayer,
        waitingFor: block? undefined: this.getWaitingFor(player, player.getWaitingFor()),
        players: players,
        autopass: player.autopass,

        // jaing
        undoing: player.undoing,
        gameId: game.id,
        block: block,
        canExit: player.canExitFun(game),
        userName: userName,
        exited: player.exited,
        isme: isme,
        isvip: GameLoader.getUserByPlayer(player)?.isvip() || 0,
      };
      return rv;
    } catch (err) {
      console.warn('error get player', err);
      return { } as PlayerViewModel;
    }
  }

  // NOT
  public static getSpectatorModel(game: IGame): SpectatorModel {
    return {
      color: 'neutral',
      id: game.spectatorId,
      game: this.getGameModel(game),
      players: game.playersInGenerationOrder.map((p) => Server.getPlayer(p, false)),
      thisPlayer: undefined,
      runId: runId,
    };
  }

  public static getPlayerBlock(player: IPlayer, userId:string|null) :PlayerBlockModel {
    let block = false;
    let isme = false;
    let showhandcards = false;
    const user = GameLoader.getUserByPlayer(player);
    if (user !== undefined ) {
      showhandcards = user.showhandcards;
      if ( !user.checkToken(userId)) {
        block = true;
      } else {
        isme = true;
      }
    }
    return {
      block: block,
      isme: isme,
      showhandcards: showhandcards,
    } as PlayerBlockModel;
  }

  public static getSelfReplicatingRobotsTargetCards(player: IPlayer): Array<CardModel> {
    return player.getSelfReplicatingRobotsTargetCards().map((targetCard) => {
      const model: CardModel = {
        resources: targetCard.resourceCount,
        name: targetCard.name,
        calculatedCost: player.getCardCost(targetCard),
        isSelfReplicatingRobotsCard: true,
      };
      return model;
    });
  }

  public static getMilestones(game: IGame): Array<ClaimedMilestoneModel> {
    const allMilestones = game.milestones;
    const claimedMilestones = game.claimedMilestones;
    const milestoneModels: Array<ClaimedMilestoneModel> = [];

    for (const milestone of allMilestones) {
      const claimed = claimedMilestones.find(
        (m) => m.milestone.name === milestone.name,
      );
      let scores: Array<MilestoneScore> = [];
      if (claimed === undefined && claimedMilestones.length < MAX_MILESTONES) {
        scores = game.players.map((player) => ({
          playerColor: player.color,
          playerScore: milestone.getScore(player),
        }));
      }

      milestoneModels.push({
        playerName: claimed?.player.name,
        playerColor: claimed?.player.color,
        name: milestone.name,
        scores,
      });
    }

    return milestoneModels;
  }

  public static getAwards(game: IGame): Array<FundedAwardModel> {
    const fundedAwards = game.fundedAwards;
    const awardModels: Array<FundedAwardModel> = [];

    for (const award of game.awards) {
      const funded = fundedAwards.find((a) => a.award.name === award.name);
      const scorer = new AwardScorer(game, award);
      let scores: Array<AwardScore> = [];
      if (fundedAwards.length < MAX_AWARDS || funded !== undefined) {
        scores = game.players.map((player) => ({
          playerColor: player.color,
          playerScore: scorer.get(player),
        }));
      }

      awardModels.push({
        playerName: funded?.player.name,
        playerColor: funded?.player.color,
        name: award.name,
        scores: scores,
      });
    }

    return awardModels;
  }

  public static getCorporationCard(player: IPlayer, corp2 : boolean = false): CardModel | undefined {
    const card = corp2? player.playedCards.corporations()[1] : player.playedCards.corporations()[0];
    if (card === undefined) return undefined;

    let discount = card.cardDiscount === undefined ? undefined : (Array.isArray(card.cardDiscount) ? card.cardDiscount : [card.cardDiscount]);

    // Too bad this is hard-coded
    if (card.name === CardName.CRESCENT_RESEARCH_ASSOCIATION) {
      discount = [{tag: Tag.MOON, amount: player.tags.count(Tag.MOON)}];
    }
    if (card.name === CardName.MARS_DIRECT) {
      discount = [{tag: Tag.MARS, amount: player.tags.count(Tag.MARS)}];
    }

    return {
      name: card.name,
      resources: card.resourceCount,
      isDisabled: card.isDisabled || false,
      warnings: Array.from(card.warnings),
      discount: discount,
      data: card.data,
      reserveUnits: Units.EMPTY,
      cloneTag: isICloneTagCard(card) ? card.cloneTag : undefined,
    };
  }

  public static getWaitingFor(
    player: IPlayer,
    waitingFor: PlayerInput | undefined,
  ): PlayerInputModel | undefined {
    if (waitingFor === undefined) {
      return undefined;
    }
    // TODO(kberg): in theory this should be in all the other toModel calls.
    const model = waitingFor.toModel(player);
    model.warning = waitingFor.warning;
    return model;
    // showReset: player.game.inputsThisRound > 0 && player.game.resettable === true && player.game.phase === Phase.ACTION,
  }

  public static getPlayer(player: IPlayer, isSelf: boolean = false): PublicPlayerModel {
    const game = player.game;
    const useHandicap = game.players.some((p) => p.handicap !== 0);
    const model: PublicPlayerModel = {
      actionsTakenThisRound: player.actionsTakenThisRound,
      actionsTakenThisGame: player.actionsTakenThisGame,
      actionsThisGeneration: Array.from(player.actionsThisGeneration),
      alliedParty: player.alliedParty,
      availableBlueCardActionCount: player.getAvailableBlueActionCount(),
      cardCost: player.cardCost,
      cardDiscount: player.colonies.cardDiscount,
      cardsInHandNbr: player.cardsInHand.length,
      citiesCount: game.board.getCities(player).length,
      coloniesCount: player.getColoniesCount(),
      color: player.color,
      corporationCard: Server.getCorporationCard(player),
      corporationCard2: Server.getCorporationCard(player, true),
      corruption: player.underworldData.corruption,
      energy: player.energy,
      energyProduction: player.production.energy,
      fleetSize: player.colonies.getFleetSize(),
      handicap: useHandicap ? player.handicap : undefined,
      heat: player.heat,
      heatProduction: player.production.heat,
      id: player.id,
      influence: TurmoilUtil.ifTurmoilElse(game, (turmoil) => turmoil.getInfluence(player), () => 0),
      isActive: player.id === game.activePlayer.id,
      lastCardPlayed: player.lastCardPlayed,
      megaCredits: player.megaCredits,
      megaCreditProduction: player.production.megacredits,
      name: player.name,
      noTagsCount: player.tags.numberOfCardsWithNoTags(),
      plants: player.plants,
      plantProduction: player.production.plants,
      protectedResources: Server.getResourceProtections(player),
      protectedProduction: Server.getProductionProtections(player),
      tableau: cardsToModel(player, player.tableau.asArray(), {showResources: true}),
      selfReplicatingRobotsCards: Server.getSelfReplicatingRobotsTargetCards(player),
      steel: player.steel,
      steelProduction: player.production.steel,
      steelValue: player.getSteelValue(),
      tags: player.tags.countAllTags(),
      terraformRating: player.terraformRating,
      timer: player.timer.serialize(),
      titanium: player.titanium,
      titaniumProduction: player.production.titanium,
      titaniumValue: player.getTitaniumValue(),
      tradesThisGeneration: player.colonies.tradesThisGeneration,
      undergroundTokens: player.underworldData.tokens.length,
      victoryPointsBreakdown: {
        terraformRating: 0,
        milestones: 0,
        awards: 0,
        greenery: 0,
        city: 0,
        escapeVelocity: 0,
        moonHabitats: 0,
        moonMines: 0,
        moonRoads: 0,
        planetaryTracks: 0,
        victoryPoints: 0,
        total: 0,
        detailsCards: [],
        detailsMilestones: [],
        detailsAwards: [],
        detailsPlanetaryTracks: [],
        negativeVP: 0,
      },
      victoryPointsByGeneration: [],
      waitingFor: player.getWaitingFor() === undefined? undefined : {},

      // undoing: false,
      // gameId: '',
      // block: false,
      // canExit: false,
      // userName: '',
      // isme: false,
      // showhandcards: false,

      exited: player.exited,
      isvip: GameLoader.getUserByPlayer(player)?.isvip() || 0,
      rankValue: GameLoader.getUserRankByPlayer(player)?.getRankValue() || -1, // 天梯 这个是传入playerInfo的数据
      rankTier: GameLoader.getUserRankByPlayer(player)?.getTier() || undefined,
    } as any as PublicPlayerModel;

    // 修复：自己永远能看到自己的分数
    if (game.phase === Phase.END || game.isSoloMode() || game.gameOptions.showOtherPlayersVP === true || isSelf) {
      model.victoryPointsBreakdown = player.getVictoryPoints();
      model.victoryPointsByGeneration = player.victoryPointsByGeneration;
    }
    return model;
  }

  private static getResourceProtections(player: IPlayer) {
    const defaultProteection = player.playedCards.has(CardName.MIRRORCOAT) ? 'on' : 'off';
    const protection: Record<Resource, Protection> = {
      megacredits: defaultProteection,
      steel: defaultProteection,
      titanium: defaultProteection,
      plants: defaultProteection,
      energy: defaultProteection,
      heat: defaultProteection,
    };

    if (player.alloysAreProtected()) {
      protection.steel = 'on';
      protection.titanium = 'on';
    }

    if (player.plantsAreProtected()) {
      protection.plants = 'on';
    } else if (player.tableau.has(CardName.BOTANICAL_EXPERIENCE)) {
      protection.plants = 'half';
    }

    return protection;
  }

  private static getProductionProtections(player: IPlayer) {
    const defaultProteection = player.tableau.has(CardName.PRIVATE_SECURITY) || player.tableau.has(CardName.MIRRORCOAT) ? 'on' : 'off';
    const protection: Record<Resource, Protection> = {
      megacredits: defaultProteection,
      steel: defaultProteection,
      titanium: defaultProteection,
      plants: defaultProteection,
      energy: defaultProteection,
      heat: defaultProteection,
    };

    if (player.alloysAreProtected()) {
      protection.steel = 'on';
      protection.titanium = 'on';
    }

    return protection;
  }

  // Oceans can't be owned so they shouldn't have a color associated with them
  // Land claim can have a color on a space without a tile
  private static getColor(space: Space): Color | undefined {
    if (
      (space.tile === undefined || space.tile.tileType !== TileType.OCEAN) &&
    space.player !== undefined
    ) {
      return space.player.color;
    }
    if (space.tile?.protectedHazard === true) {
      return 'bronze';
    }
    return undefined;
  }

  private static getSpaces(
    board: Board,
    gagarin: ReadonlyArray<SpaceId> = [],
    cathedrals: ReadonlyArray<SpaceId> = [],
    nomads: SpaceId | undefined = undefined): Array<SpaceModel> {
    const volcanicSpaceIds = board.volcanicSpaceIds;
    const noctisCitySpaceId = board.noctisCitySpaceId;

    return board.spaces.map((space) => {
      let highlight: SpaceHighlight = undefined;
      if (volcanicSpaceIds.includes(space.id)) {
        highlight = 'volcanic';
      } else if (noctisCitySpaceId === space.id) {
        highlight = 'noctis';
      }

      const model: SpaceModel = {
        x: space.x,
        y: space.y,
        id: space.id,
        spaceType: space.spaceType,
        bonus: space.bonus,
      };
      const tileType = space.tile?.tileType;
      if (tileType !== undefined) {
        model.tileType = tileType;
      }
      const color = this.getColor(space);
      if (color !== undefined) {
        model.color = color;
      }
      if (highlight === undefined) {
        model.highlight = highlight;
      }
      if (space.tile?.rotated === true) {
        model.rotated = true;
      }
      const gagarinIndex = gagarin.indexOf(space.id);
      if (gagarinIndex > -1) {
        model.gagarin = gagarinIndex;
      }
      if (cathedrals.includes(space.id)) {
        model.cathedral = true;
      }
      if (space.id === nomads) {
        model.nomads = true;
      }
      if (space.undergroundResources !== undefined) {
        model.undergroundResources = space.undergroundResources;
      }
      if (space.excavator !== undefined) {
        model.excavator = space.excavator.color;
      }
      if (space.coOwner !== undefined) {
        model.coOwner = space.coOwner.color;
      }

      return model;
    });
  }

  public static getGameOptionsAsModel(options: GameOptions): GameOptionsModel {
    return {
      ...options,
      expansions: {
        corpera: options.corporateEra,
        promo: options.promoCardsOption,
        venus: options.venusNextExtension,
        colonies: options.coloniesExtension,
        prelude: options.preludeExtension,
        prelude2: options.prelude2Expansion,
        turmoil: options.turmoilExtension,
        community: options.communityCardsOption,
        ares: options.aresExtension,
        moon: options.moonExpansion,
        pathfinders: options.pathfindersExpansion,
        ceo: options.ceoExtension,
        starwars: options.starWarsExpansion,
        underworld: options.underworldExpansion,
        breakthrough: options.breakthrough,
        eros: options.erosCardsOption,
        commission: options.commissionCardsOption,
      },
    };
  // return {
  //   altVenusBoard: options.altVenusBoard,
  //   aresExtension: options.aresExtension,
  //   boardName: options.boardName,
  //    bannedCards: options.bannedCards,
    //   includedCards: options.includedCards,
    //     ceoExtension: options.ceoExtension,
  //   coloniesExtension: options.coloniesExtension,
  //   communityCardsOption: options.communityCardsOption,
  //   corporateEra: options.corporateEra,
  //   draftVariant: options.draftVariant,
  //   escapeVelocityMode: options.escapeVelocityMode,
  //   escapeVelocityThreshold: options.escapeVelocityThreshold,
  //    escapeVelocityBonusSeconds: options.escapeVelocityBonusSeconds,
  //   escapeVelocityPeriod: options.escapeVelocityPeriod,
  //   escapeVelocityPenalty: options.escapeVelocityPenalty,
  //   fastModeOption: options.fastModeOption,
  //    includeFanMA: options.includeFanMA,
  //   includeVenusMA: options.includeVenusMA,
  //   initialDraftVariant: options.initialDraftVariant,
  //   moonExpansion: options.moonExpansion,
  //   pathfindersExpansion: options.pathfindersExpansion,
  //   preludeExtension: options.preludeExtension,
  //    prelude2Expansion: options.prelude2Expansion,
  //   promoCardsOption: options.promoCardsOption,
  //   politicalAgendasExtension: options.politicalAgendasExtension,
  //   removeNegativeGlobalEventsOption: options.removeNegativeGlobalEventsOption,
  //   showOtherPlayersVP: options.showOtherPlayersVP,
  //   showTimers: options.showTimers,
  //   shuffleMapOption: options.shuffleMapOption,
  //   solarPhaseOption: options.solarPhaseOption,
  //   soloTR: options.soloTR,
  //   randomMA: options.randomMA,
  //   turmoilExtension: options.turmoilExtension,
  //   venusNextExtension: options.venusNextExtension,
  //   requiresMoonTrackCompletion: options.requiresMoonTrackCompletion,
  //   requiresVenusTrackCompletion: options.requiresVenusTrackCompletion,
  //    twoCorpsVariant: options.twoCorpsVariant,
  //   undoOption: options.undoOption,
    //   underworldExpansion: options.underworldExpansion,
  // };
  }

  private static getMoonModel(game: IGame): MoonModel | undefined {
    return MoonExpansion.ifElseMoon(game, (moonData) => {
      return {
        logisticsRate: moonData.logisticRate,
        miningRate: moonData.miningRate,
        habitatRate: moonData.habitatRate,
        spaces: this.getSpaces(moonData.moon),
      };
    }, () => undefined);
  }
}
