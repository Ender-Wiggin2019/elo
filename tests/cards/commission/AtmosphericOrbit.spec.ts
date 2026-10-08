import {expect} from 'chai';
import {MAX_TEMPERATURE} from '../../../src/common/constants';
import {Tag} from '../../../src/common/cards/Tag';
import {AtmosphericOrbit} from '../../../src/server/cards/commission/AtmosphericOrbit';
import {StrategicRetrieval} from '../../../src/server/cards/commission/StrategicRetrieval';
import {AccumulatedKnowledge} from '../../../src/server/cards/community/AccumulatedKnowledge';
import {JunkVentures} from '../../../src/server/cards/community/JunkVentures';
import {PoliticalUprising} from '../../../src/server/cards/community/PoliticalUprising';
import {BorderCheckpoint} from '../../../src/server/cards/eros/BorderCheckpoint';
import {ReturntoAbandonedTechnology} from '../../../src/server/cards/pathfinders/ReturntoAbandonedTechnology';
import {Research} from '../../../src/server/cards/base/Research';
import {AICentral} from '../../../src/server/cards/base/AICentral';
import {OpenCity} from '../../../src/server/cards/base/OpenCity';
import {EarthOffice} from '../../../src/server/cards/base/EarthOffice';
import {MicroMills} from '../../../src/server/cards/base/MicroMills';
import {PROffice} from '../../../src/server/cards/turmoil/PROffice';
import {VenusOrbitalSurvey} from '../../../src/server/cards/prelude2/VenusOrbitalSurvey';
import {DrawCards} from '../../../src/server/deferredActions/DrawCards';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, fakeCard, runAllActions, setTemperature, setVenusScaleLevel} from '../../TestingUtils';

describe('AtmosphericOrbit', () => {
  let card: AtmosphericOrbit;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new AtmosphericOrbit();
    [game, player, player2] = testGame(2, {
      coloniesExtension: true,
      skipInitialShuffling: true,
    });
    player.playCorporationCard(card);
    runAllActions(game);
  });

  function drawAndGetChoice(count: number = 1): OrOptions {
    player.drawCard(count);
    runAllActions(game);
    return cast(player.popWaitingFor(), OrOptions);
  }

  it('starts with 47 M€ and 5 heat, and its first action draws one card and offers one data', () => {
    expect(card.startingMegaCredits).to.eq(47);
    expect(player.heat).to.eq(5);

    const initialHandSize = player.cardsInHand.length;
    player.defer(card.initialAction(player));
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(initialHandSize + 1);
    expect(card.resourceCount).to.eq(1);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('triggers once for a three-card draw operation', () => {
    const initialHandSize = player.cardsInHand.length;
    player.drawCard(3);
    runAllActions(game);
    expect(player.cardsInHand).to.have.length(initialHandSize + 3);
    expect(card.resourceCount).to.eq(1);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('waits for the kept cards before triggering for a selective draw', () => {
    game.defer(DrawCards.keepSome(player, 4, {keepMax: 2}));
    runAllActions(game);
    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).to.be.empty;

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb(selectCard.cards.slice(0, 2));
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(2);
    expect(card.resourceCount).to.eq(1);
  });

  for (const bought of [0, 2]) {
    it(`triggers only after buying cards from a draw (${bought} bought)`, () => {
      player.megaCredits = 6;
      game.defer(DrawCards.keepSome(player, 2, {paying: true}));
      runAllActions(game);
      expect(card.resourceCount).to.eq(0);

      const selectCard = cast(player.popWaitingFor(), SelectCard);
      selectCard.cb(selectCard.cards.slice(0, bought));
      expect(card.resourceCount).to.eq(0);
      runAllActions(game);

      expect(player.cardsInHand).to.have.length(bought);
      expect(player.megaCredits).to.eq(6 - bought * player.cardCost);
      expect(card.resourceCount).to.eq(bought > 0 ? 1 : 0);
    });
  }

  for (const [free, bought] of [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]]) {
    it(`triggers once for Venus Orbital Survey only if cards are kept (${free} free, ${bought} bought)`, () => {
      player.megaCredits = 6;
      game.projectDeck.drawPile = Array.from({length: 2}, (_, i) => fakeCard({tags: i < free ? [Tag.VENUS] : []}));
      new VenusOrbitalSurvey().action(player);
      runAllActions(game);

      if (free < 2) {
        expect(card.resourceCount).to.eq(0);
        const selectCard = cast(player.popWaitingFor(), SelectCard);
        selectCard.cb(selectCard.cards.slice(0, bought));
        runAllActions(game);
      }

      expect(player.cardsInHand).to.have.length(free + bought);
      expect(player.megaCredits).to.eq(6 - bought * player.cardCost);
      expect(card.resourceCount).to.eq(free + bought > 0 ? 1 : 0);
      expect(player.getWaitingFor()).to.be.undefined;
    });
  }

  it('triggers once for each project action that draws from the discard pile', () => {
    const chooseOne = () => {
      const selectCard = cast(player.popWaitingFor(), SelectCard);
      expect(card.resourceCount).to.eq(0);
      selectCard.cb([selectCard.cards[0]]);
      runAllActions(game);
    };

    player.energy = 2;
    game.projectDeck.discard(new Research(), new AICentral(), new OpenCity());
    new StrategicRetrieval().action(player);
    runAllActions(game);
    chooseOne();
    expect(card.resourceCount).to.eq(1);

    card.resourceCount = 0;
    game.projectDeck.discard(new Research(), new AICentral(), new OpenCity());
    new JunkVentures().action(player);
    runAllActions(game);
    chooseOne();
    expect(card.resourceCount).to.eq(1);

    card.resourceCount = 0;
    game.projectDeck.discard(new Research());
    new BorderCheckpoint().action(player);
    runAllActions(game);
    chooseOne();
    expect(card.resourceCount).to.eq(1);

    card.resourceCount = 0;
    game.projectDeck.discard(new Research(), new AICentral(), new OpenCity(), new EarthOffice());
    new ReturntoAbandonedTechnology().bespokePlay(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(0);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb(selectCard.cards.slice(0, 2));
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not trigger for Junk Ventures initial discards', () => {
    const junkVentures = new JunkVentures();
    player.game.projectDeck.drawPile = [new Research(), new AICentral(), new OpenCity()];
    player.game.projectDeck.discardPile = [];

    junkVentures.initialAction(player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).to.be.empty;
  });

  it('triggers for the replacement card drawn by Accumulated Knowledge', () => {
    const accumulatedKnowledge = new AccumulatedKnowledge();
    accumulatedKnowledge.bespokePlay(player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
    const choice = cast(player.popWaitingFor(), OrOptions);
    const discardOption = cast(choice.options[0], SelectCard);
    discardOption.cb([player.cardsInHand[0]]);
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(4);
    expect(card.resourceCount).to.eq(2);
  });

  it('triggers for Political Uprising drawing a Turmoil card', () => {
    const politicalUprising = new PoliticalUprising();
    game.projectDeck.drawPile = [new MicroMills(), new PROffice()];
    game.projectDeck.discardPile = [];

    politicalUprising.bespokePlay(player);
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(1);
    expect(player.cardsInHand[0]).to.be.instanceOf(PROffice);
    expect(card.resourceCount).to.eq(1);
  });

  it('offers one choice for each temperature step', () => {
    const initialTemperature = game.getTemperature();
    card.resourceCount = 3;
    setVenusScaleLevel(game, 0);
    player.megaCredits = 100;

    game.increaseTemperature(player, 2);
    expect(game.getTemperature()).to.eq(initialTemperature + 4);
    runAllActions(game);

    const firstChoice = cast(player.popWaitingFor(), OrOptions);
    expect(firstChoice.options).to.have.length(2);
    firstChoice.options[0].cb();
    runAllActions(game);
    const secondChoice = cast(player.popWaitingFor(), OrOptions);
    expect(secondChoice.options).to.have.length(2);
    secondChoice.options[0].cb();
    runAllActions(game);

    expect(card.resourceCount).to.eq(5);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('only reacts to draws and temperature increases belonging to its owner', () => {
    player2.drawCard();
    runAllActions(game);
    game.increaseTemperature(player2, 1);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('does not react when temperature is already capped', () => {
    setTemperature(game, MAX_TEMPERATURE);

    game.increaseTemperature(player, 1);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('at three data, offers Venus as an alternative to storing data', () => {
    card.resourceCount = 3;
    setVenusScaleLevel(game, 0);
    player.megaCredits = 10;

    const choice = drawAndGetChoice();
    expect(choice.options).to.have.length(2);
    const venusOption = choice.options.find((option) => option.title.toString().includes('金星'));
    expect(venusOption).to.exist;

    venusOption!.cb();
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(game.getVenusScaleLevel()).to.eq(2);
  });

  it('at five data, offers the three-way choice and can build a colony', () => {
    card.resourceCount = 5;
    const playableColonies = player.colonies.getPlayableColonies();
    expect(playableColonies).to.not.be.empty;

    const choice = drawAndGetChoice();
    expect(choice.options).to.have.length(3);
    const colonyOption = choice.options.find((option) => option.title.toString().includes('殖民地'));
    expect(colonyOption).to.exist;

    colonyOption!.cb();
    runAllActions(game);
    const selectColony = cast(player.popWaitingFor(), SelectColony);
    const colony = selectColony.colonies[0];
    selectColony.cb(colony);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(colony.colonies).to.include(player);
  });

  it('does not trigger while buying a card during research', () => {
    player.megaCredits = 100;
    player.runResearchPhase();

    const research = cast(player.popWaitingFor(), SelectCard);
    expect(research.cards).to.not.be.empty;
    const initialHandSize = player.cardsInHand.length;
    research.cb([research.cards[0]]);
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(initialHandSize + 1);
    expect(card.resourceCount).to.eq(0);
    expect(player.getWaitingFor()).to.not.be.instanceOf(OrOptions);
  });
});
