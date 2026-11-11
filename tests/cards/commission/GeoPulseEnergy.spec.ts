import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {Phase} from '../../../src/common/Phase';
import {TileType} from '../../../src/common/TileType';
import {SpaceType} from '../../../src/common/boards/SpaceType';
import {Payment} from '../../../src/common/inputs/Payment';
import {GeoPulseEnergy} from '../../../src/server/cards/commission/GeoPulseEnergy';
import {IGame} from '../../../src/server/IGame';
import {BoardType} from '../../../src/server/boards/BoardType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {newCorporationCard} from '../../../src/server/createCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {addOcean, cast, formatMessage, runAllActions} from '../../TestingUtils';

describe('GeoPulseEnergy', () => {
  let card: GeoPulseEnergy;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new GeoPulseEnergy();
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
    game.board = EmptyBoard.newInstance();
    game.phase = Phase.ACTION;
    player.playedCards.push(card);
  });

  function placeTile() {
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    game.addTile(player, space, {tileType: TileType.GREENERY});
    runAllActions(game);
  }

  function pay(payment: Payment) {
    const options = cast(player.popWaitingFor(), OrOptions);
    cast(options.options[0], SelectPayment).process({type: 'payment', payment}, player);
    runAllActions(game);
  }

  it('is registered with 42 M€, building and power tags, and no free production or VP', () => {
    expect(newCorporationCard(CardName.GEOPULSE_ENERGY)).instanceOf(GeoPulseEnergy);
    expect(card.startingMegaCredits).eq(42);
    expect(card.tags).deep.eq([Tag.BUILDING, Tag.POWER]);
    expect(card.getVictoryPoints(player)).eq(0);
    expect(card.metadata.cardNumber).eq('XB99');
    card.play(player);
    runAllActions(game);
    expect(player.production.energy).eq(0);
    expect(player.production.megacredits).eq(0);
  });

  it('places a natural preserve beside another tile as its first action and triggers its effect', () => {
    const adjacent = game.board.getAvailableSpacesOnLand(otherPlayer)[0];
    game.addTile(otherPlayer, adjacent, {tileType: TileType.GREENERY});
    player.megaCredits = 5;
    player.defer(card.initialAction(player));
    runAllActions(game);
    const input = cast(player.popWaitingFor(), SelectSpace);
    const space = game.board.getAdjacentSpaces(adjacent)[0];
    expect(input.spaces).includes(space);
    input.cb(space);
    runAllActions(game);

    expect(space.tile?.tileType).eq(TileType.NATURAL_PRESERVE);
    expect(space.tile?.card).eq(CardName.GEOPULSE_ENERGY);
    expect(space.player).eq(player);
    expect(player.production.megacredits).eq(0);
    expect(card.getVictoryPoints(player)).eq(0);
    pay(Payment.of({megacredits: 5}));
    expect(player.production.energy).eq(1);
    expect(player.energy).eq(1);
  });

  it('can pay 5 M€ for one energy production and one energy, logging both gains once', () => {
    player.megaCredits = 5;
    placeTile();
    expect(player.production.energy).eq(0);
    expect(player.energy).eq(0);
    pay(Payment.of({megacredits: 5}));

    expect(player.megaCredits).eq(0);
    expect(player.production.energy).eq(1);
    expect(player.energy).eq(1);
    const logs = game.gameLog.map(formatMessage);
    expect(logs.filter((entry) => entry.includes('energy production') && entry.includes(card.name))).has.length(1);
    expect(logs.filter((entry) => entry === `blue gained 1 energy because of ${card.name}`)).has.length(1);
  });

  it('can combine steel and M€ for payment', () => {
    player.megaCredits = 3;
    player.steel = 1;
    placeTile();
    pay(Payment.of({megacredits: 3, steel: 1}));
    expect(player.megaCredits).eq(0);
    expect(player.steel).eq(0);
    expect(player.production.energy).eq(1);
    expect(player.energy).eq(1);
  });

  it('can pay entirely in steel at its current value', () => {
    player.steel = 2;
    player.steelValue = 3;
    placeTile();
    pay(Payment.of({steel: 2}));
    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(0);
    expect(player.production.energy).eq(1);
    expect(player.energy).eq(1);
  });

  it('can decline without spending resources or gaining energy', () => {
    player.megaCredits = 5;
    placeTile();
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    runAllActions(game);
    expect(player.megaCredits).eq(5);
    expect(player.production.energy).eq(0);
    expect(player.energy).eq(0);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry.includes('declined') && entry.includes(card.name))).has.length(1);
  });

  it('does not offer payment when funds are insufficient', () => {
    player.megaCredits = 4;
    placeTile();
    cast(player.popWaitingFor(), undefined);
    expect(player.production.energy).eq(0);
  });

  it('does not allow titanium to pay the steel-enabled cost', () => {
    player.titanium = 2;
    placeTile();
    cast(player.popWaitingFor(), undefined);
    expect(player.titanium).eq(2);
  });

  it('rejects underpayment and leaves resources and gains unchanged', () => {
    player.megaCredits = 5;
    placeTile();
    const options = cast(player.popWaitingFor(), OrOptions);
    const input = cast(options.options[0], SelectPayment);
    expect(() => input.process({type: 'payment', payment: Payment.of({megacredits: 4})}, player)).throws('Did not spend enough');
    expect(player.megaCredits).eq(5);
    expect(player.production.energy).eq(0);
    expect(player.energy).eq(0);
  });

  it('checks affordability separately for queued placements', () => {
    player.megaCredits = 5;
    const spaces = game.board.getAvailableSpacesOnLand(player);
    game.addTile(player, spaces[0], {tileType: TileType.GREENERY});
    game.addTile(player, spaces[1], {tileType: TileType.GREENERY});
    runAllActions(game);
    pay(Payment.of({megacredits: 5}));
    cast(player.popWaitingFor(), undefined);
    expect(player.production.energy).eq(1);
    expect(player.energy).eq(1);
  });

  it('does not trigger for other players', () => {
    player.megaCredits = 5;
    game.addTile(otherPlayer, game.board.getAvailableSpacesOnLand(otherPlayer)[0], {tileType: TileType.GREENERY});
    runAllActions(game);
    cast(player.popWaitingFor(), undefined);
    expect(player.megaCredits).eq(5);
  });

  it('triggers for its owner placing an ocean on Mars', () => {
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
    player.playedCards.push(card);
    player.megaCredits = 5;
    addOcean(player);
    runAllActions(game);
    pay(Payment.of({megacredits: 5}));
    expect(player.production.energy).eq(1);
    expect(player.energy).eq(1);
  });

  it('does not trigger on the Moon, colony spaces, or during the solar phase', () => {
    player.megaCredits = 15;
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    card.onTilePlaced(player, player, space, BoardType.MOON);
    card.onTilePlaced(player, player, {...space, spaceType: SpaceType.COLONY}, BoardType.MARS);
    game.phase = Phase.SOLAR;
    card.onTilePlaced(player, player, space, BoardType.MARS);
    runAllActions(game);
    cast(player.popWaitingFor(), undefined);
    expect(player.megaCredits).eq(15);
    expect(player.production.energy).eq(0);
    expect(player.energy).eq(0);
  });
});
