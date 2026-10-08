import {expect} from 'chai';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SpaceType} from '../../../src/common/boards/SpaceType';
import {TileType} from '../../../src/common/TileType';
import {MeteoriteLakeside} from '../../../src/server/cards/commission/MeteoriteLakeside';
import {MarsNomads} from '../../../src/server/cards/promo/MarsNomads';
import {IGame} from '../../../src/server/IGame';
import {Board} from '../../../src/server/boards/Board';
import {Space} from '../../../src/server/boards/Space';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, runAllActions, setRulingParty} from '../../TestingUtils';

describe('MeteoriteLakeside', () => {
  let card: MeteoriteLakeside;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new MeteoriteLakeside();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
    player.playCorporationCard(card);
    runAllActions(game);
    player.megaCredits = 42;
  });

  function addOceanForOtherPlayer(): void {
    const space = game.board.getAvailableSpacesForOcean(player2)[0];
    game.addOcean(player2, space);
    runAllActions(game);
  }

  function skipOceanBonus(input: OrOptions): void {
    const skip = input.options.find((option) => option.title.toString().includes('跳过'));
    expect(skip).to.exist;
    skip!.cb();
    runAllActions(game);
  }

  function findLandNextToOceans(count: number): {land: Space, oceans: Array<Space>} {
    const land = game.board.getAvailableSpacesOnLand(player).find((space) => {
      const oceans = game.board.getAdjacentSpaces(space).filter((adjacent) =>
        adjacent.spaceType === SpaceType.OCEAN && adjacent.tile === undefined,
      );
      return oceans.length >= count;
    });
    if (land === undefined) {
      throw new Error(`Could not find a land space next to ${count} open ocean spaces`);
    }
    const oceans = game.board.getAdjacentSpaces(land).filter((adjacent) =>
      adjacent.spaceType === SpaceType.OCEAN && adjacent.tile === undefined,
    ).slice(0, count);
    return {land, oceans};
  }

  function prepareAdjacentOceans(count: number): Space {
    const {land, oceans} = findLandNextToOceans(count);
    land.bonus = [];
    for (const ocean of oceans) {
      game.simpleAddTile(player2, ocean, {tileType: TileType.OCEAN});
    }
    expect(game.board.getAdjacentSpaces(land).filter(Board.isOceanSpace)).to.have.length.of.at.least(count);
    return land;
  }

  it('starts with 42 M€ and its first action places an ocean on land', () => {
    expect(card.startingMegaCredits).to.eq(42);
    const initialOceanCount = game.board.getOceanSpaces().length;

    player.defer(card.initialAction(player));
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    expect(selectSpace.spaces).to.not.be.empty;
    expect(selectSpace.spaces.every((space) => space.spaceType !== SpaceType.OCEAN)).to.be.true;

    const destination = selectSpace.spaces[0];
    selectSpace.cb(destination);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).to.have.length(initialOceanCount + 1);
    expect(Board.isOceanSpace(destination)).to.be.true;
    const oceanBonus = player.popWaitingFor();
    expect(oceanBonus).to.be.instanceOf(OrOptions);
    skipOceanBonus(cast(oceanBonus, OrOptions));
  });

  it('offers the ocean bonus for an ocean placed by any player, payable with M€ or steel', () => {
    player.megaCredits = 4;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();

    const moneyChoice = cast(player.popWaitingFor(), OrOptions);
    expect(moneyChoice.options).to.have.length(2);
    const moneyOption = moneyChoice.options.find((option) => option.title.toString().includes('4 M€'));
    expect(moneyOption).to.exist;
    moneyOption!.cb();
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 1);

    player.steel = 2;
    const secondInitialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const steelChoice = cast(player.popWaitingFor(), OrOptions);
    expect(steelChoice.options).to.have.length(2);
    const steelOption = steelChoice.options.find((option) => option.title.toString().includes('2钢铁'));
    expect(steelOption).to.exist;
    steelOption!.cb();
    runAllActions(game);

    expect(player.steel).to.eq(0);
    expect(player.getTerraformRating()).to.eq(secondInitialTR + 1);
  });

  it('offers one adjacency draw even when the placed tile touches two oceans', () => {
    const land = prepareAdjacentOceans(2);
    player.oceanBonus = 0;
    player.megaCredits = 2;
    const initialHandSize = player.cardsInHand.length;

    game.addTile(player, land, {tileType: TileType.GREENERY});
    runAllActions(game);

    const choice = cast(player.popWaitingFor(), OrOptions);
    expect(choice.options).to.have.length(2);
    const drawOption = choice.options.find((option) => option.title.toString().includes('2 M€'));
    expect(drawOption).to.exist;
    drawOption!.cb();
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.cardsInHand).to.have.length(initialHandSize + 1);
  });

  it('does not offer the adjacency draw when another player places the tile', () => {
    const land = prepareAdjacentOceans(1);
    const initialHandSize = player.cardsInHand.length;
    player.megaCredits = 10;

    game.addTile(player2, land, {tileType: TileType.GREENERY});
    runAllActions(game);

    expect(player.getWaitingFor()).to.be.undefined;
    expect(player.cardsInHand).to.have.length(initialHandSize);
  });

  it('does not treat an ocean upgrade as a newly placed ocean', () => {
    const ocean = game.board.getAvailableSpacesForOcean(player2)[0];
    game.simpleAddTile(player2, ocean, {tileType: TileType.OCEAN});
    player.megaCredits = 10;
    game.addTile(player2, ocean, {tileType: TileType.OCEAN_FARM});
    runAllActions(game);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('does not offer the adjacency draw when the owner cannot pay 2 M€', () => {
    const land = prepareAdjacentOceans(1);
    player.oceanBonus = 0;
    player.megaCredits = 1;

    game.addTile(player, land, {tileType: TileType.GREENERY});
    runAllActions(game);

    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('rechecks adjacency affordability after paying the ocean reward', () => {
    const land = prepareAdjacentOceans(1);
    player.oceanBonus = 0;
    player.megaCredits = 4;
    const initialTR = player.getTerraformRating();

    game.addOcean(player, land);
    runAllActions(game);

    const oceanChoice = cast(player.popWaitingFor(), OrOptions);
    const moneyOption = oceanChoice.options.find((option) => option.title.toString().includes('4 M€'));
    expect(moneyOption).to.exist;
    expect(oceanChoice.options.some((option) => option.title.toString().includes('跳过星陨湖畔效果'))).to.be.true;
    moneyOption!.cb();
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 2);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('allows both rewards when the owner can pay for both', () => {
    const land = prepareAdjacentOceans(1);
    player.oceanBonus = 0;
    player.megaCredits = 6;
    const initialHandSize = player.cardsInHand.length;
    const initialTR = player.getTerraformRating();

    game.addOcean(player, land);
    runAllActions(game);

    const oceanChoice = cast(player.popWaitingFor(), OrOptions);
    const moneyOption = oceanChoice.options.find((option) => option.title.toString().includes('4 M€'));
    expect(moneyOption).to.exist;
    moneyOption!.cb();
    runAllActions(game);

    const adjacencyChoice = cast(player.popWaitingFor(), OrOptions);
    const drawOption = adjacencyChoice.options.find((option) => option.title.toString().includes('2 M€'));
    expect(drawOption).to.exist;
    expect(adjacencyChoice.options.some((option) => option.title.toString().includes('跳过邻海摸牌'))).to.be.true;
    drawOption!.cb();
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.cardsInHand).to.have.length(initialHandSize + 1);
    expect(player.getTerraformRating()).to.eq(initialTR + 2);
  });

  it('resolves the steel ocean reward and adjacency draw with the Reds costs', () => {
    card = new MeteoriteLakeside();
    [game, player, player2] = testGame(2, {
      skipInitialShuffling: true,
      turmoilExtension: true,
    });
    player.playCorporationCard(card);
    runAllActions(game);
    setRulingParty(game, PartyName.REDS, 'rp01');

    const land = prepareAdjacentOceans(1);
    player.oceanBonus = 0;
    player.megaCredits = 8;
    player.steel = 2;
    const initialHandSize = player.cardsInHand.length;
    const initialTR = player.getTerraformRating();

    game.addOcean(player, land);
    runAllActions(game);

    const oceanChoice = cast(player.popWaitingFor(), OrOptions);
    const steelOption = oceanChoice.options.find((option) => option.title.toString().includes('2钢铁'));
    expect(steelOption).to.exist;
    expect(oceanChoice.options.some((option) => option.title.toString().includes('4 M€'))).to.be.false;
    steelOption!.cb();
    runAllActions(game);

    const adjacencyChoice = cast(player.popWaitingFor(), OrOptions);
    const drawOption = adjacencyChoice.options.find((option) => option.title.toString().includes('2 M€'));
    expect(drawOption).to.exist;
    drawOption!.cb();
    runAllActions(game);

    expect(player.steel).to.eq(0);
    expect(player.megaCredits).to.eq(0);
    expect(player.cardsInHand).to.have.length(initialHandSize + 1);
    expect(player.getTerraformRating()).to.eq(initialTR + 2);
  });

  it('does not offer the adjacency draw when Mars Nomads moves without placing a tile', () => {
    const land = prepareAdjacentOceans(1);
    player.oceanBonus = 0;
    player.megaCredits = 10;
    const start = game.board.getAvailableSpacesOnLand(player).find((space) =>
      space !== land && game.board.getAdjacentSpaces(space).includes(land),
    );
    expect(start).to.exist;

    const nomads = new MarsNomads();
    const initialPlacement = cast(nomads.bespokePlay(player), SelectSpace);
    expect(initialPlacement.spaces).to.include(start);
    initialPlacement.cb(start!);
    const move = cast(nomads.action(player), SelectSpace);
    expect(move.spaces).to.include(land);

    const initialHandSize = player.cardsInHand.length;
    move.cb(land);
    runAllActions(game);

    expect(land.tile).to.be.undefined;
    expect(player.getWaitingFor()).to.be.undefined;
    expect(player.cardsInHand).to.have.length(initialHandSize);
  });

  it('accounts for the Reds TR surcharge when deciding whether the ocean bonus is affordable', () => {
    card = new MeteoriteLakeside();
    [game, player, player2] = testGame(2, {
      skipInitialShuffling: true,
      turmoilExtension: true,
    });
    player.playCorporationCard(card);
    runAllActions(game);
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.megaCredits = 7;
    const initialTR = player.getTerraformRating();

    addOceanForOtherPlayer();
    const choice = cast(player.popWaitingFor(), OrOptions);
    const moneyOption = choice.options.find((option) => option.title.toString().includes('4 M€'));
    expect(moneyOption).to.exist;
    moneyOption!.cb();
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 1);
  });
});
