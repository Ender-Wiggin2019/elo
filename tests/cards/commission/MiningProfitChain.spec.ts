import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Payment} from '../../../src/common/inputs/Payment';
import {Resource} from '../../../src/common/Resource';
import {Mine} from '../../../src/server/cards/base/Mine';
import {SpaceElevator} from '../../../src/server/cards/base/SpaceElevator';
import {MiningProfitChain} from '../../../src/server/cards/commission/MiningProfitChain';
import {SolBank} from '../../../src/server/cards/pathfinders/SolBank';
import {AgroDrones} from '../../../src/server/cards/pathfinders/AgroDrones';
import {ImprovedMoonConcrete} from '../../../src/server/cards/moon/ImprovedMoonConcrete';
import {LunaMiningHub} from '../../../src/server/cards/moon/LunaMiningHub';
import {MoonRoadStandardProjectVariant1} from '../../../src/server/cards/moon/MoonStandardProjectVariants1';
import {VoltaicMetallurgy} from '../../../src/server/cards/underworld/VoltaicMetallurgy';
import {Ceres} from '../../../src/server/colonies/Ceres';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {MoonExpansion} from '../../../src/server/moon/MoonExpansion';
import {SellSteel} from '../../../src/server/moon/SellSteel';
import {TradeWithSteel, TradeWithTitanium} from '../../../src/server/player/Colonies';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, fakeCard, formatMessage, runAllActions, testGame} from '../../TestingUtils';

describe('MiningProfitChain', () => {
  let card: MiningProfitChain;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new MiningProfitChain();
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
  });

  function activate(): void {
    player.playedCards.push(card);
  }

  function rebateLogs(): Array<string> {
    return game.gameLog.map(formatMessage).filter((entry) =>
      entry === 'blue gained 1 M€ because of 🌸矿业利润链🌸');
  }

  it('requires two building tags before it can be played', () => {
    expect(card.type).eq(CardType.ACTIVE);
    expect(card.cost).eq(9);
    expect(card.tags).deep.eq([Tag.BUILDING]);
    expect(card.getVictoryPoints(player)).eq(1);
    expect(card.canPlay(player)).is.false;

    player.playedCards.push(fakeCard({tags: [Tag.BUILDING]}));
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(fakeCard({tags: [Tag.BUILDING]}));
    expect(card.canPlay(player)).is.true;
  });

  for (const payment of [
    Payment.of({steel: 5}),
    Payment.of({titanium: 4}),
    Payment.of({steel: 3, titanium: 2, megacredits: 2}),
  ]) {
    it(`gains only 1 M€ for one payment of ${payment.steel} steel and ${payment.titanium} titanium`, () => {
      activate();
      player.steel = payment.steel;
      player.titanium = payment.titanium;
      player.megaCredits = payment.megacredits;

      player.pay(payment);
      expect(player.megaCredits).eq(0);
      runAllActions(game);

      expect(player.steel).eq(0);
      expect(player.titanium).eq(0);
      expect(player.megaCredits).eq(1);
      expect(rebateLogs()).length(1);
    });
  }

  it('triggers separately for separate payments', () => {
    activate();
    player.steel = 3;
    player.titanium = 2;

    player.pay(Payment.of({steel: 3}));
    player.pay(Payment.of({titanium: 2}));
    runAllActions(game);

    expect(player.megaCredits).eq(2);
    expect(rebateLogs()).length(2);
  });

  it('does not trigger for cash, heat, a free payment, or another player spending metal', () => {
    activate();
    player.megaCredits = 5;
    player.heat = 3;
    otherPlayer.steel = 4;

    player.pay(Payment.of({megacredits: 5}));
    player.pay(Payment.of({heat: 3}));
    player.pay(Payment.EMPTY);
    otherPlayer.pay(Payment.of({steel: 4}));
    runAllActions(game);

    expect(player.megaCredits).eq(0);
    expect(player.heat).eq(0);
    expect(otherPlayer.megaCredits).eq(0);
    expect(rebateLogs()).is.empty;
  });

  it('rewards a real card payment after the metal is spent', () => {
    activate();
    const mine = new Mine();
    player.cardsInHand = [mine];
    player.steel = 2;

    player.checkPaymentAndPlayCard(mine, Payment.of({steel: 2}));
    runAllActions(game);

    expect(player.playedCards.has(CardName.MINE)).is.true;
    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(1);
    expect(rebateLogs()).length(1);
  });

  it('does not use the rebate to pay for the card being played', () => {
    activate();
    const mine = new Mine();
    player.cardsInHand = [mine];
    player.steel = 1;
    player.megaCredits = 1;

    expect(player.canPlay(mine)).is.false;
    expect(player.megaCredits).eq(1);
    expect(rebateLogs()).is.empty;
  });

  it('does not reward paying for Mining Profit Chain itself', () => {
    player.playedCards.push(fakeCard({tags: [Tag.BUILDING, Tag.BUILDING]}));
    player.cardsInHand = [card];
    player.steel = 4;
    player.megaCredits = 1;

    player.checkPaymentAndPlayCard(card, Payment.of({steel: 4, megacredits: 1}));
    runAllActions(game);

    expect(player.playedCards.has(card.name)).is.true;
    expect(player.megaCredits).eq(0);
    expect(rebateLogs()).is.empty;
  });

  it('rewards steel spent by a card action', () => {
    activate();
    const elevator = new SpaceElevator();
    player.playedCards.push(elevator);
    player.steel = 1;

    elevator.action(player);
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(6);
    expect(rebateLogs()).length(1);
  });

  it('does not reward gains, self-removal, attacks, theft, or production losses', () => {
    activate();
    player.stock.add(Resource.STEEL, 5);
    player.stock.add(Resource.TITANIUM, 2);
    player.stock.deduct(Resource.STEEL, 1, {log: true});
    player.stock.deduct(Resource.STEEL, 1, {from: {player: otherPlayer}, log: true});
    player.stock.steal(Resource.TITANIUM, 1, otherPlayer);
    player.production.add(Resource.STEEL, 2);
    player.production.add(Resource.STEEL, -1);
    runAllActions(game);

    expect(player.megaCredits).eq(0);
    expect(rebateLogs()).is.empty;
  });

  it('rewards a combined steel and energy action once', () => {
    activate();
    player.steel = 1;
    player.energy = 1;

    new AgroDrones().action(player);
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(player.energy).eq(0);
    expect(player.plants).eq(3);
    expect(player.megaCredits).eq(1);
    expect(rebateLogs()).length(1);
  });

  it('rewards converting several steel to titanium once', () => {
    activate();
    player.steel = 3;
    player.tagsForTest = {power: 3};

    cast(new VoltaicMetallurgy().action(player), SelectAmount).cb(3);
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(player.titanium).eq(3);
    expect(player.megaCredits).eq(1);
    expect(rebateLogs()).length(1);
  });

  for (const sellAmount of [0, 3]) {
    it(`rewards a steel sale only when steel is actually spent: ${sellAmount}`, () => {
      activate();
      player.steel = 3;

      cast(new SellSteel(player).execute(), SelectAmount).cb(sellAmount);
      runAllActions(game);

      expect(player.steel).eq(3 - sellAmount);
      expect(player.megaCredits).eq(sellAmount === 0 ? 0 : 10);
      expect(rebateLogs()).length(sellAmount === 0 ? 0 : 1);
    });
  }

  for (const metal of [Resource.STEEL, Resource.TITANIUM]) {
    it(`rewards a colony trade paid in ${metal}`, () => {
      activate();
      player.steel = 4;
      player.titanium = 3;
      const trader = metal === Resource.STEEL ? new TradeWithSteel(player) : new TradeWithTitanium(player);

      trader.trade(new Ceres());
      runAllActions(game);

      expect(player.megaCredits).eq(1);
      expect(rebateLogs()).length(1);
    });
  }

  it('rewards a printed steel cost even when the card price is paid entirely in M€', () => {
    [game, player, otherPlayer] = testGame(2, {moonExpansion: true, skipInitialShuffling: true});
    activate();
    const concrete = new ImprovedMoonConcrete();
    player.cardsInHand = [concrete];
    player.megaCredits = concrete.cost;
    player.steel = 2;

    player.checkPaymentAndPlayCard(concrete, Payment.of({megacredits: concrete.cost}));
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(1);
    expect(rebateLogs()).length(1);
  });

  it('counts a card price and its printed mixed metal cost as one payment', () => {
    [game, player, otherPlayer] = testGame(2, {moonExpansion: true, skipInitialShuffling: true});
    activate();
    MoonExpansion.moonData(game).miningRate = 5;
    const hub = new LunaMiningHub();
    player.cardsInHand = [hub];
    player.steel = 12;
    player.titanium = 1;
    player.megaCredits = 1;

    player.checkPaymentAndPlayCard(hub, Payment.of({steel: 11, megacredits: 1}));
    runAllActions(game);
    const spaceChoice = cast(player.popWaitingFor(), SelectSpace);
    spaceChoice.cb(spaceChoice.spaces[0]);
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(player.titanium).eq(0);
    expect(rebateLogs()).length(1);
  });

  it('counts a Moon standard project price and its reserved steel as one payment', () => {
    [game, player, otherPlayer] = testGame(2, {
      moonExpansion: true, moonStandardProjectVariant1: true, skipInitialShuffling: true,
    });
    activate();
    player.steel = 10;
    player.megaCredits = 1;

    new MoonRoadStandardProjectVariant1().payAndExecute(player, Payment.of({steel: 9, megacredits: 1}));
    runAllActions(game);
    const spaceChoice = cast(player.popWaitingFor(), SelectSpace);
    spaceChoice.cb(spaceChoice.spaces[0]);
    runAllActions(game);

    expect(player.steel).eq(0);
    expect(rebateLogs()).length(1);
  });

  it('coexists with SolBank without duplicating either payment reward', () => {
    activate();
    const bank = new SolBank();
    player.corporations.push(bank);
    player.steel = 3;
    player.titanium = 2;
    player.megaCredits = 4;

    player.pay(Payment.of({steel: 3, titanium: 2, megacredits: 4}));
    runAllActions(game);

    expect(player.megaCredits).eq(1);
    expect(bank.resourceCount).eq(1);
    expect(rebateLogs()).length(1);
  });
});
