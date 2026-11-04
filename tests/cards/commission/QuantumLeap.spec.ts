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

  it('starts with 38 M€ and draws one card', () => {
    expect(card.startingMegaCredits).eq(38);
    expect(card.tags).is.empty;
    card.play(player);
    runAllActions(game);
    expect(player.cardsInHand).has.length(1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry.includes('drew 1 card'))).has.length(1);
  });

  it('takes a paid action immediately and leaves the normal action available', () => {
    const target = new DevelopmentCenter();
    player.energy = 2;
    player.cardsInHand.push(target);

    player.playCard(target);
    runAllActions(game);

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

  it('waits for initial play resources before checking and executing the action', () => {
    const target = new SpaceElevator();
    // A play effect may grant the resource needed by the action through the queue.
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
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(5);
    expect(player.actionsThisGeneration.has(target.name)).is.false;
  });

  it('resolves an interactive action and its card purchase', () => {
    const target = new InventorsGuild();
    player.megaCredits = 3;
    player.cardsInHand.push(target);
    player.playCard(target);
    runAllActions(game);

    const input = cast(player.popWaitingFor(), SelectCard);
    expect(input.cards).has.length(1);
    input.cb([input.cards[0]]);
    runAllActions(game);
    expect(player.cardsInHand).deep.eq([input.cards[0]]);
    expect(player.megaCredits).eq(0);
    expect(player.actionsThisGeneration.has(target.name)).is.false;
  });

  it('does not act for a card played outside the hand or by another player', () => {
    player.energy = 2;
    player.playCard(new DevelopmentCenter());
    otherPlayer.energy = 2;
    const target = new DevelopmentCenter();
    otherPlayer.cardsInHand.push(target);
    otherPlayer.playCard(target);
    runAllActions(game);

    expect(player.energy).eq(2);
    expect(otherPlayer.energy).eq(2);
    expect(card.data.activatedCards).is.empty;
  });

  it('ignores blue cards with no action and cards of other colors', () => {
    const green = fakeCard({type: CardType.AUTOMATED});
    const red = fakeCard({type: CardType.EVENT});
    const blue = new EarthOffice();
    for (const target of [green, red, blue]) {
      player.cardsInHand.push(target);
      player.playCard(target);
    }
    runAllActions(game);
    expect(card.data.activatedCards).is.empty;
  });

  it('does not grant a later extra action if its cost cannot be paid on play', () => {
    const target = new DevelopmentCenter();
    player.cardsInHand.push(target);
    player.playCard(target);
    runAllActions(game);
    expect(player.cardsInHand).is.empty;

    player.energy = 1;
    card.onCardPlayedFromHand(player, target);
    runAllActions(game);
    expect(player.energy).eq(1);
    expect(player.cardsInHand).is.empty;
  });

  it('persists once-per-card usage across reloads and generations', () => {
    const target = new DevelopmentCenter();
    player.energy = 3;
    player.cardsInHand.push(target);
    player.playCard(target);
    runAllActions(game);

    const restored = cast(deserializeCorporationCard(serializeCorporationCard(card)), QuantumLeap);
    expect(restored.data.activatedCards).deep.eq([target.name]);
    game.generation++;
    restored.onCardPlayedFromHand(player, target);
    runAllActions(game);
    expect(player.energy).eq(2);
    expect(player.cardsInHand).has.length(1);
  });
});
