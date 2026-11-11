import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {QuantumLeap} from '../../../src/server/cards/commission/QuantumLeap';
import {DevelopmentCenter} from '../../../src/server/cards/base/DevelopmentCenter';
import {EarthOffice} from '../../../src/server/cards/base/EarthOffice';
import {SpaceElevator} from '../../../src/server/cards/base/SpaceElevator';
import {InventorsGuild} from '../../../src/server/cards/base/InventorsGuild';
import {serializeCorporationCard, deserializeCorporationCard} from '../../../src/server/cards/CardSerialization';
import {IGame} from '../../../src/server/IGame';
import {Priority} from '../../../src/server/deferredActions/Priority';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast, fakeCard, formatMessage, runAllActions} from '../../TestingUtils';

describe('QuantumLeap', () => {
  let card: QuantumLeap;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new QuantumLeap();
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
    player.playedCards.push(card);
  });

  function chooseReward(index: number) {
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[index].cb();
    runAllActions(game);
  }

  it('starts with 49 M€ and draws one card', () => {
    expect(card.startingMegaCredits).eq(49);
    expect(card.tags).is.empty;
    card.play(player);
    runAllActions(game);
    expect(player.cardsInHand).has.length(1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry.includes('drew 1 card'))).has.length(1);
  });

  it('can choose 2 M€ instead of an available action', () => {
    player.energy = 2;
    player.playCard(new DevelopmentCenter());
    chooseReward(0);

    expect(player.megaCredits).eq(2);
    expect(player.energy).eq(2);
    expect(player.cardsInHand).is.empty;
    expect(game.gameLog.map(formatMessage).filter((entry) => entry === 'blue gained 2 M€ because of 🌸量子跃迁🌸')).has.length(1);
  });

  it('takes a paid action immediately and leaves the normal action available', () => {
    const target = new DevelopmentCenter();
    player.energy = 2;
    player.cardsInHand.push(target);
    player.playCard(target);
    chooseReward(1);

    expect(player.energy).eq(1);
    expect(player.cardsInHand).has.length(1);
    expect(player.actionsThisGeneration.has(target.name)).is.false;
    expect(player.getPlayableActionCards()).includes(target);
    const logs = game.gameLog.map(formatMessage);
    expect(logs.filter((entry) => entry.includes('used Development Center action with 🌸量子跃迁🌸'))).has.length(1);
    expect(logs.filter((entry) => entry.includes('drew 1 card(s)'))).has.length(1);

    cast(player.playActionCard(), SelectCard).cb([target]);
    runAllActions(game);
    expect(player.energy).eq(0);
    expect(player.cardsInHand).has.length(2);
    expect(player.actionsThisGeneration.has(target.name)).is.true;
  });

  it('waits for initial play resources before checking the action cost', () => {
    const target = new SpaceElevator();
    const originalPlay = target.play.bind(target);
    target.play = (owner) => {
      owner.defer(() => {
        owner.steel = 1;
        return undefined;
      }, Priority.GAIN_RESOURCE_OR_PRODUCTION);
      return originalPlay(owner);
    };
    player.cardsInHand.push(target);
    player.playCard(target);
    chooseReward(1);

    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(5);
    expect(player.actionsThisGeneration.has(target.name)).is.false;
  });

  it('resolves an interactive action and its card purchase', () => {
    const target = new InventorsGuild();
    player.megaCredits = 3;
    player.cardsInHand.push(target);
    player.playCard(target);
    chooseReward(1);

    const input = cast(player.popWaitingFor(), SelectCard);
    expect(input.cards).has.length(1);
    input.cb([input.cards[0]]);
    runAllActions(game);
    expect(player.cardsInHand).deep.eq([input.cards[0]]);
    expect(player.megaCredits).eq(0);
    expect(player.actionsThisGeneration.has(target.name)).is.false;
  });

  it('also triggers for blue cards played outside the hand', () => {
    player.energy = 1;
    player.playCard(new DevelopmentCenter());
    chooseReward(1);
    expect(player.energy).eq(0);
    expect(player.cardsInHand).has.length(1);
  });

  it('does not trigger for another player', () => {
    otherPlayer.energy = 2;
    otherPlayer.playCard(new DevelopmentCenter());
    runAllActions(game);
    expect(otherPlayer.energy).eq(2);
    expect(player.megaCredits).eq(0);
    cast(player.popWaitingFor(), undefined);
    cast(otherPlayer.popWaitingFor(), undefined);
  });

  it('gains 2 M€ for blue cards without an action and ignores other colors', () => {
    for (const target of [fakeCard({type: CardType.AUTOMATED}), fakeCard({type: CardType.EVENT}), new EarthOffice()]) {
      player.playCard(target);
    }
    runAllActions(game);
    expect(player.megaCredits).eq(2);
    cast(player.popWaitingFor(), undefined);
  });

  it('gains 2 M€ when the blue card action cannot be paid', () => {
    player.playCard(new DevelopmentCenter());
    runAllActions(game);
    expect(player.megaCredits).eq(2);
    expect(player.cardsInHand).is.empty;
    cast(player.popWaitingFor(), undefined);
  });

  it('grants the extra action even if the normal action was already used', () => {
    const target = new DevelopmentCenter();
    player.energy = 1;
    player.actionsThisGeneration.add(target.name);
    player.playCard(target);
    chooseReward(1);
    expect(player.energy).eq(0);
    expect(player.cardsInHand).has.length(1);
    expect(player.actionsThisGeneration.has(target.name)).is.true;
  });

  it('can trigger on subsequent plays after reload and in later generations', () => {
    player.energy = 2;
    player.playCard(new DevelopmentCenter());
    chooseReward(1);

    const restored = cast(deserializeCorporationCard(serializeCorporationCard(card)), QuantumLeap);
    game.generation++;
    restored.onCardPlayed(player, new DevelopmentCenter());
    chooseReward(1);
    expect(player.energy).eq(0);
    expect(player.cardsInHand).has.length(2);
  });
});
