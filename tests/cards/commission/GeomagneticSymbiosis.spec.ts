import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {GeomagneticSymbiosis} from '../../../src/server/cards/commission/GeomagneticSymbiosis';
import {AresHandler} from '../../../src/server/ares/AresHandler';
import {TestPlayer} from '../../TestPlayer';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {cast, formatMessage, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('GeomagneticSymbiosis', () => {
  let card: GeomagneticSymbiosis;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GeomagneticSymbiosis();
    [game, player, otherPlayer] = testGame(2, {aresExtension: true, skipInitialShuffling: true});
    game.board = EmptyBoard.newInstance();
  });

  it('starts with 45 M€, draws 3 cards, and places the Ares commercial district as its first action', () => {
    expect(card.startingMegaCredits).eq(45);
    expect(card.tags).deep.eq([Tag.BUILDING]);

    player.playCorporationCard(card);
    runAllActions(game);
    expect(player.cardsInHand).has.length(3);

    player.defer(card.initialAction(player));
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);
    runAllActions(game);

    expect(space.tile?.tileType).eq(TileType.COMMERCIAL_DISTRICT);
    expect(space.tile?.card).eq(CardName.GEOMAGNETIC_SYMBIOSIS);
    expect(space.adjacency).deep.eq({bonus: [SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS]});
    expect(card.getVictoryPoints(player)).eq(0);
    expect(player.production.megacredits).eq(0);
  });

  it('gains one steel when each owned adjacency-bonus tile provides its bonus', () => {
    player.playedCards.push(card);

    const providingSpace = game.board.getAvailableSpacesOnLand(player)[0];
    providingSpace.adjacency = {bonus: [SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS]};
    game.addTile(player, providingSpace, {tileType: TileType.COMMERCIAL_DISTRICT});
    const ownPlacement = game.board.getAdjacentSpaces(providingSpace).find((space) => space.tile === undefined);
    if (ownPlacement === undefined) {
      throw new Error('Could not find an adjacent space for the owner placement');
    }
    game.addTile(player, ownPlacement, {tileType: TileType.GREENERY});
    runAllActions(game);

    expect(player.steel).eq(1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry === `blue gained 1 steel because of ${CardName.GEOMAGNETIC_SYMBIOSIS}`)).has.length(1);

    const otherPlacement = game.board.getAdjacentSpaces(providingSpace).find((space) => space.tile === undefined);
    if (otherPlacement === undefined) {
      throw new Error('Could not find another adjacent space for the other player placement');
    }
    game.addTile(otherPlayer, otherPlacement, {tileType: TileType.GREENERY});
    runAllActions(game);

    expect(player.steel).eq(2);
  });

  it('does not trigger for a tile without a bonus or when the owner bonus is disabled', () => {
    player.playedCards.push(card);
    const noBonusSpace = game.board.getAvailableSpacesOnLand(player)[0];
    noBonusSpace.adjacency = {bonus: []};
    game.addTile(player, noBonusSpace, {tileType: TileType.GREENERY});
    const adjacentSpace = game.board.getAdjacentSpaces(noBonusSpace).find((space) => space.tile === undefined);
    if (adjacentSpace === undefined) {
      throw new Error('Could not find an adjacent space');
    }
    game.addTile(otherPlayer, adjacentSpace, {tileType: TileType.GREENERY});
    runAllActions(game);
    expect(player.steel).eq(0);

    const providingSpace = game.board.getAvailableSpacesOnLand(player)[0];
    providingSpace.adjacency = {bonus: [SpaceBonus.MEGACREDITS, SpaceBonus.MEGACREDITS]};
    game.addTile(player, providingSpace, {tileType: TileType.COMMERCIAL_DISTRICT});
    const placement = game.board.getAdjacentSpaces(providingSpace).find((space) => space.tile === undefined);
    if (placement === undefined) {
      throw new Error('Could not find another adjacent space');
    }
    AresHandler.earnAdjacencyBonuses(otherPlayer, placement, {giveAresTileOwnerBonus: false});
    expect(player.steel).eq(0);
  });
});
