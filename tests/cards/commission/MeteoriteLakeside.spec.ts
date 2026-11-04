import {expect} from 'chai';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SpaceType} from '../../../src/common/boards/SpaceType';
import {TileType} from '../../../src/common/TileType';
import {Payment} from '../../../src/common/inputs/Payment';
import {MeteoriteLakeside} from '../../../src/server/cards/commission/MeteoriteLakeside';
import {MiningProfitChain} from '../../../src/server/cards/commission/MiningProfitChain';
import {MarsNomads} from '../../../src/server/cards/promo/MarsNomads';
import {Helion} from '../../../src/server/cards/corporation/Helion';
import {StormCraftIncorporated} from '../../../src/server/cards/colonies/StormCraftIncorporated';
import {IGame} from '../../../src/server/IGame';
import {Board} from '../../../src/server/boards/Board';
import {Space} from '../../../src/server/boards/Space';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {AndOptions} from '../../../src/server/inputs/AndOptions';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, formatMessage, runAllActions, setRulingParty} from '../../TestingUtils';

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
    player.megaCredits = 45;
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

  function payOceanBonus(input: OrOptions, payment: Partial<Payment>): void {
    const option = cast(input.options[0], SelectPayment);
    expect(option.paymentOptions.steel).is.true;
    player.defer(option.process({type: 'payment', payment: Payment.of(payment)}, player));
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

  it('starts with 45 M€ and its first action places an ocean on land', () => {
    expect(card.startingMegaCredits).to.eq(45);
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
    player.megaCredits = 5;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();

    const moneyChoice = cast(player.popWaitingFor(), OrOptions);
    expect(moneyChoice.options).to.have.length(2);
    const moneyOption = moneyChoice.options.find((option) => option.title.toString().includes('5 M€'));
    expect(moneyOption).to.exist;
    game.gameLog.length = 0;
    payOceanBonus(moneyChoice, {megacredits: 5});

    expect(player.megaCredits).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue gained 1 TR from 🌸星陨湖畔🌸')).to.have.length(1);

    player.steel = 3;
    const secondInitialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const steelChoice = cast(player.popWaitingFor(), OrOptions);
    expect(steelChoice.options).to.have.length(2);
    expect(steelChoice.options.some((option) => option.title.toString().includes('钛'))).to.be.false;
    game.gameLog.length = 0;
    payOceanBonus(steelChoice, {steel: 3});

    expect(player.steel).to.eq(0);
    expect(player.getTerraformRating()).to.eq(secondInitialTR + 1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue gained 1 TR from 🌸星陨湖畔🌸')).to.have.length(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 3 steel because of 🌸星陨湖畔🌸')).to.have.length(1);
  });

  it('does not offer the ocean bonus with titanium or insufficient steel', () => {
    player.megaCredits = 0;
    player.titanium = 2;
    player.steel = 2;

    addOceanForOtherPlayer();

    expect(player.getWaitingFor()).to.be.undefined;
  });

  for (const [money, steel, steelValue] of [[1, 2, 2], [3, 1, 2], [0, 2, 3]]) {
    it(`pays the 5 M€ cost with ${money} M€ and ${steel} steel worth ${steelValue} M€ each`, () => {
      player.megaCredits = money;
      player.steel = steel;
      player.steelValue = steelValue;
      const initialTR = player.getTerraformRating();
      addOceanForOtherPlayer();
      const choice = cast(player.popWaitingFor(), OrOptions);
      const model = cast(choice.options[0], SelectPayment).toModel(player);
      expect(model.amount).eq(5);
      expect(model.paymentOptions.steel).is.true;
      game.gameLog.length = 0;
      payOceanBonus(choice, {megacredits: money, steel});

      expect(player.megaCredits).eq(0);
      expect(player.steel).eq(0);
      expect(player.getTerraformRating()).eq(initialTR + 1);
      const logs = game.gameLog.map(formatMessage);
      expect(logs.filter((entry) => entry === `blue lost ${steel} steel because of 🌸星陨湖畔🌸`)).has.length(1);
      expect(logs.filter((entry) => entry === 'blue gained 1 TR from 🌸星陨湖畔🌸')).has.length(1);
      if (money > 0) {
        expect(logs.filter((entry) => entry === `blue lost ${money} M€ because of 🌸星陨湖畔🌸`)).has.length(1);
      }
    });
  }

  it('rejects underpayment before spending resources or increasing TR', () => {
    player.megaCredits = 1;
    player.steel = 2;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const payment = cast(cast(player.popWaitingFor(), OrOptions).options[0], SelectPayment);
    expect(() => payment.process({type: 'payment', payment: Payment.of({steel: 2})}, player)).to.throw('Did not spend enough');
    expect(player.megaCredits).eq(1);
    expect(player.steel).eq(2);
    expect(player.getTerraformRating()).eq(initialTR);
  });

  it('keeps Luna titanium substitution at its normal M€ rate', () => {
    player.canUseTitaniumAsMegacredits = true;
    player.megaCredits = 1;
    player.titanium = 2;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const choice = cast(player.popWaitingFor(), OrOptions);
    game.gameLog.length = 0;
    payOceanBonus(choice, {megacredits: 1, titanium: 2});
    expect(player.megaCredits).eq(0);
    expect(player.titanium).eq(0);
    expect(player.getTerraformRating()).eq(initialTR + 1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry === 'blue lost 2 titanium because of 🌸星陨湖畔🌸')).has.length(1);
  });

  it('can decline an affordable mixed payment without spending or gaining TR', () => {
    player.megaCredits = 1;
    player.steel = 2;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    game.gameLog.length = 0;
    skipOceanBonus(cast(player.popWaitingFor(), OrOptions));
    expect(player.megaCredits).eq(1);
    expect(player.steel).eq(2);
    expect(player.getTerraformRating()).eq(initialTR);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry.includes('because of 🌸星陨湖畔🌸') || entry.includes('TR from 🌸星陨湖畔🌸'))).is.empty;
  });

  it('waits for Stormcraft heat payment before increasing TR and logging the actual cost', () => {
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(new Helion());
    player.playCorporationCard(stormcraft);
    runAllActions(game);
    player.megaCredits = 0;
    player.steel = 1;
    player.heat = 1;
    stormcraft.resourceCount = 1;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const payment = cast(cast(player.popWaitingFor(), OrOptions).options[0], SelectPayment);
    game.gameLog.length = 0;
    const heatPayment = cast(payment.process({type: 'payment', payment: Payment.of({steel: 1, heat: 3})}, player), AndOptions);
    expect(player.getTerraformRating()).eq(initialTR);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry.includes('TR from 🌸星陨湖畔🌸'))).is.empty;

    cast(heatPayment.options[0], SelectAmount).cb(1);
    cast(heatPayment.options[1], SelectAmount).cb(1);
    heatPayment.cb(undefined);
    runAllActions(game);
    expect(player.steel).eq(0);
    expect(player.heat).eq(0);
    expect(stormcraft.resourceCount).eq(0);
    expect(player.getTerraformRating()).eq(initialTR + 1);
    const logs = game.gameLog.map(formatMessage);
    expect(logs.filter((entry) => entry === 'blue lost 1 heat because of 🌸星陨湖畔🌸')).has.length(1);
    expect(logs.filter((entry) => entry === 'blue lost 1 steel because of 🌸星陨湖畔🌸')).has.length(1);
    expect(logs.filter((entry) => entry === 'blue gained 1 TR from 🌸星陨湖畔🌸')).has.length(1);
  });

  it('triggers Mining Profit Chain when paying steel for the ocean bonus', () => {
    player.playedCards.push(new MiningProfitChain());
    player.megaCredits = 0;
    player.steel = 3;
    const initialTR = player.getTerraformRating();

    addOceanForOtherPlayer();

    const choice = cast(player.popWaitingFor(), OrOptions);
    game.gameLog.length = 0;
    payOceanBonus(choice, {steel: 3});

    expect(player.megaCredits).to.eq(1);
    expect(player.steel).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue gained 1 M€ because of 🌸矿业利润链🌸')).to.have.length(1);
  });

  it('triggers for a Wetlands tile as an uncovered ocean', () => {
    player.megaCredits = 0;
    player.steel = 3;
    const land = game.board.getAvailableSpacesOnLand(player2)[0];

    game.addTile(player2, land, {tileType: TileType.WETLANDS});
    runAllActions(game);

    const choice = cast(player.popWaitingFor(), OrOptions);
    payOceanBonus(choice, {steel: 3});

    expect(player.steel).to.eq(0);
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
    player.megaCredits = 5;
    const initialTR = player.getTerraformRating();

    game.addOcean(player, land);
    runAllActions(game);

    const oceanChoice = cast(player.popWaitingFor(), OrOptions);
    const moneyOption = oceanChoice.options.find((option) => option.title.toString().includes('5 M€'));
    expect(moneyOption).to.exist;
    expect(oceanChoice.options.some((option) => option.title.toString().includes('跳过星陨湖畔效果'))).to.be.true;
    payOceanBonus(oceanChoice, {megacredits: 5});

    expect(player.megaCredits).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 2);
    expect(player.getWaitingFor()).to.be.undefined;
  });

  it('allows both rewards when the owner can pay for both', () => {
    const land = prepareAdjacentOceans(1);
    player.oceanBonus = 0;
    player.megaCredits = 7;
    const initialHandSize = player.cardsInHand.length;
    const initialTR = player.getTerraformRating();

    game.addOcean(player, land);
    runAllActions(game);

    const oceanChoice = cast(player.popWaitingFor(), OrOptions);
    const moneyOption = oceanChoice.options.find((option) => option.title.toString().includes('5 M€'));
    expect(moneyOption).to.exist;
    payOceanBonus(oceanChoice, {megacredits: 5});

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
    player.steel = 3;
    const initialHandSize = player.cardsInHand.length;
    const initialTR = player.getTerraformRating();

    game.addOcean(player, land);
    runAllActions(game);

    const oceanChoice = cast(player.popWaitingFor(), OrOptions);
    expect(cast(oceanChoice.options[0], SelectPayment).reserveUnits?.megacredits).eq(3);
    payOceanBonus(oceanChoice, {steel: 3});

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
    player.megaCredits = 8;
    const initialTR = player.getTerraformRating();

    addOceanForOtherPlayer();
    const choice = cast(player.popWaitingFor(), OrOptions);
    const moneyOption = choice.options.find((option) => option.title.toString().includes('5 M€'));
    expect(moneyOption).to.exist;
    payOceanBonus(choice, {megacredits: 5});

    expect(player.megaCredits).to.eq(0);
    expect(player.getTerraformRating()).to.eq(initialTR + 1);
  });

  it('preserves the Reds surcharge when validating the selected payment', () => {
    [game, player, player2] = testGame(2, {skipInitialShuffling: true, turmoilExtension: true});
    player.playCorporationCard(card);
    runAllActions(game);
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.megaCredits = 8;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const choice = cast(player.popWaitingFor(), OrOptions);
    const payment = cast(choice.options[0], SelectPayment);
    expect(payment.reserveUnits?.megacredits).eq(3);
    expect(() => payment.process({type: 'payment', payment: Payment.of({megacredits: 8})}, player)).to.throw('You do not have that many resources');
    expect(player.megaCredits).eq(8);
    expect(player.getTerraformRating()).eq(initialTR);
    payOceanBonus(choice, {megacredits: 5});
    expect(player.megaCredits).eq(0);
    expect(player.getTerraformRating()).eq(initialTR + 1);
  });

  it('does not count the same indivisible Luna titanium toward both costs under Reds', () => {
    [game, player, player2] = testGame(2, {skipInitialShuffling: true, turmoilExtension: true});
    player.playCorporationCard(card);
    runAllActions(game);
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.canUseTitaniumAsMegacredits = true;
    player.megaCredits = 0;
    player.titanium = 4;
    addOceanForOtherPlayer();
    expect(player.getWaitingFor()).is.undefined;
    expect(player.titanium).eq(4);
  });

  it('preserves Reds heat while Stormcraft chooses which resources to spend', () => {
    [game, player, player2] = testGame(2, {skipInitialShuffling: true, turmoilExtension: true});
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(card);
    player.playCorporationCard(new Helion());
    player.playCorporationCard(stormcraft);
    runAllActions(game);
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.megaCredits = 0;
    player.steel = 1;
    player.heat = 2;
    stormcraft.resourceCount = 2;
    const initialTR = player.getTerraformRating();
    addOceanForOtherPlayer();
    const payment = cast(cast(player.popWaitingFor(), OrOptions).options[0], SelectPayment);
    const heatPayment = cast(payment.process({type: 'payment', payment: Payment.of({steel: 1, heat: 3})}, player), AndOptions);
    expect(cast(heatPayment.options[1], SelectAmount).max).eq(1);

    expect(cast(heatPayment.options[1], SelectAmount).max).eq(1);
    cast(heatPayment.options[0], SelectAmount).cb(0);
    cast(heatPayment.options[1], SelectAmount).cb(2);
    expect(() => heatPayment.cb(undefined)).to.throw('reserved heat');
    expect(player.heat).eq(2);
    expect(stormcraft.resourceCount).eq(2);
    expect(player.getTerraformRating()).eq(initialTR);

    cast(heatPayment.options[0], SelectAmount).cb(1);
    cast(heatPayment.options[1], SelectAmount).cb(1);
    heatPayment.cb(undefined);
    runAllActions(game);
    const redsPayment = cast(player.popWaitingFor(), SelectPayment);
    player.defer(redsPayment.process({type: 'payment', payment: Payment.of({heat: 3})}, player));
    runAllActions(game);
    const redsHeat = cast(player.popWaitingFor(), AndOptions);
    cast(redsHeat.options[0], SelectAmount).cb(1);
    cast(redsHeat.options[1], SelectAmount).cb(1);
    redsHeat.cb(undefined);
    runAllActions(game);
    expect(player.steel).eq(0);
    expect(player.heat).eq(0);
    expect(stormcraft.resourceCount).eq(0);
    expect(player.getTerraformRating()).eq(initialTR + 1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry === 'blue gained 1 TR from 🌸星陨湖畔🌸')).has.length(1);
  });

  it('does not offer a payment when indivisible Stormcraft floaters cannot cover both costs', () => {
    [game, player, player2] = testGame(2, {skipInitialShuffling: true, turmoilExtension: true});
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(card);
    player.playCorporationCard(new Helion());
    player.playCorporationCard(stormcraft);
    runAllActions(game);
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.megaCredits = 0;
    player.steel = 2;
    player.heat = 0;
    stormcraft.resourceCount = 2;
    addOceanForOtherPlayer();
    expect(player.getWaitingFor()).is.undefined;
    expect(player.steel).eq(2);
    expect(stormcraft.resourceCount).eq(2);
  });
});
