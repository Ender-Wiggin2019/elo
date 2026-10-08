import {expect} from 'chai';
import {RedPlanetOceans} from '../../../src/server/cards/commission/RedPlanetOceans';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Phase} from '../../../src/common/Phase';
import {BoardName} from '../../../src/common/boards/BoardName';
import {SpaceName} from '../../../src/common/boards/SpaceName';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {PlaceOceanTile} from '../../../src/server/deferredActions/PlaceOceanTile';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Whales} from '../../../src/server/cards/underworld/Whales';
import {GreatAquifer} from '../../../src/server/cards/prelude/GreatAquifer';
import {AquiferPumping} from '../../../src/server/cards/base/AquiferPumping';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {maxOutOceans, runAllActions, testRedsCosts} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('RedPlanetOceans', () => {
  let card: RedPlanetOceans;
  let game: ReturnType<typeof testGame>[0];
  let player: TestPlayer;

  beforeEach(() => {
    [game, player] = testGame(2, {skipInitialShuffling: true});
    card = new RedPlanetOceans();
    player.playedCards.push(card);
  });

  it('has the expected active card properties', () => {
    expect(card.cost).to.eq(5);
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.SPACE]);
  });

  it('spends 14 M€ and places an ocean', () => {
    player.megaCredits = 14;
    const initialTerraformRating = player.terraformRating;

    cast(card.action(player), undefined);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(game.board.getOceanSpaces()).to.have.lengthOf(1);
    expect(player.terraformRating).to.eq(initialTerraformRating + 1);
  });

  it('spends 9 heat and places an ocean', () => {
    player.heat = 9;
    const initialTerraformRating = player.terraformRating;

    cast(card.action(player), undefined);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(game.board.getOceanSpaces()).to.have.lengthOf(1);
    expect(player.terraformRating).to.eq(initialTerraformRating + 1);
  });

  it('converts each behavior ocean attempt at the cap into TR', () => {
    maxOutOceans(player);
    const initialTerraformRating = player.terraformRating;

    new GreatAquifer().play(player);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).to.have.lengthOf(9);
    expect(player.terraformRating).to.eq(initialTerraformRating + 2);
  });

  it('converts only the overflow when two oceans cross the cap', () => {
    maxOutOceans(player, 8);
    const initialTerraformRating = player.terraformRating;

    new GreatAquifer().play(player);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).to.have.lengthOf(9);
    expect(player.terraformRating).to.eq(initialTerraformRating + 2);
  });

  it('converts a direct addOcean attempt at the cap into TR without a tile', () => {
    maxOutOceans(player);
    const initialTerraformRating = player.terraformRating;
    const space = game.board.getSpaceOrThrow(game.board.getOceanSpaces()[0].id);

    game.addOcean(player, space);

    expect(game.board.getOceanSpaces()).to.have.lengthOf(9);
    expect(player.terraformRating).to.eq(initialTerraformRating + 1);
  });

  it('preserves Whales and chained deferred actions at the cap', () => {
    maxOutOceans(player);
    const initialTerraformRating = player.terraformRating;
    const whales = new Whales();
    player.playedCards.push(whales);
    let chained = false;

    game.defer(new PlaceOceanTile(player)).andThen(() => {
      chained = true;
      return undefined;
    });
    runAllActions(game);

    expect(whales.resourceCount).to.eq(1);
    expect(player.terraformRating).to.eq(initialTerraformRating + 1);
    expect(chained).to.eq(true);
  });

  it('credits the credited player for deferred ocean attempts', () => {
    const creditedPlayer = game.players[1] as TestPlayer;
    const creditedCard = new RedPlanetOceans();
    creditedPlayer.playedCards.push(creditedCard);
    const actorInitialTerraformRating = player.terraformRating;
    maxOutOceans(player);
    const initialTerraformRating = creditedPlayer.terraformRating;

    game.defer(new PlaceOceanTile(player, {creditedPlayer}));
    runAllActions(game);

    expect(player.terraformRating).to.eq(actorInitialTerraformRating + 9);
    expect(creditedPlayer.terraformRating).to.eq(initialTerraformRating + 1);
  });

  it('does not grant owner TR during Solar or Intergeneration phases', () => {
    maxOutOceans(player);
    const solarRating = player.terraformRating;
    game.phase = Phase.SOLAR;
    game.addOcean(player, game.board.getSpaceOrThrow(game.board.getOceanSpaces()[0].id));
    expect(player.terraformRating).to.eq(solarRating);

    game.phase = Phase.INTERGENERATION;
    game.addOcean(player, game.board.getSpaceOrThrow(game.board.getOceanSpaces()[0].id));
    expect(player.terraformRating).to.eq(solarRating);
  });

  it('requires Reds payment for the converted TR', () => {
    [game, player] = testGame(2, {skipInitialShuffling: true, turmoilExtension: true});
    card = new RedPlanetOceans();
    player.playedCards.push(card);
    maxOutOceans(player);
    testRedsCosts(() => card.canAct(player), player, 14, 3);
  });

  it('applies the converted TR Reds surcharge to other ocean sources', () => {
    [game, player] = testGame(2, {skipInitialShuffling: true, turmoilExtension: true});
    card = new RedPlanetOceans();
    player.playedCards.push(card);
    maxOutOceans(player);
    player.steel = 0;
    const aquiferPumping = new AquiferPumping();

    testRedsCosts(() => aquiferPumping.canAct(player), player, 8, 3);
  });

  it('keeps the Hellas ocean bonus payment when oceans are full', () => {
    [game, player] = testGame(2, {boardName: BoardName.HELLAS, skipInitialShuffling: true});
    card = new RedPlanetOceans();
    player.playedCards.push(card);
    maxOutOceans(player);
    const oceanBonusSpace = game.board.getSpaceOrThrow(SpaceName.HELLAS_OCEAN_TILE);

    player.megaCredits = 6;
    expect(game.board.getAvailableSpacesOnLand(player)).to.include(oceanBonusSpace);

    const initialTerraformRating = player.terraformRating;
    game.grantSpaceBonus(player, SpaceBonus.OCEAN);
    runAllActions(game);
    expect(player.megaCredits).to.eq(0);
    expect(player.terraformRating).to.eq(initialTerraformRating + 1);

    player.megaCredits = 5;
    expect(game.board.getAvailableSpacesOnLand(player)).to.not.include(oceanBonusSpace);
  });
});
