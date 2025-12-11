import {expect} from 'chai';
import {TradeNavigator} from '../../../../src/server/cards/eros/corp/TradeNavigator';
import {testGame, runAllActions, finishGeneration} from '../../../TestingUtils';
import {TestPlayer} from '../../../TestPlayer';
import {IGame} from '../../../../src/server/IGame';
import {Luna} from '../../../../src/server/colonies/Luna';
import {Ceres} from '../../../../src/server/colonies/Ceres';
import {Callisto} from '../../../../src/server/colonies/Callisto';


describe('TradeNavigator', () => {
  let card: TradeNavigator;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TradeNavigator();
    [game, player, opponent] = testGame(2, {coloniesExtension: true, skipInitialShuffling: true});
    player.playCorporationCard(card);
  });


  it('自己作为本回合第一个贸易者时，获得双份奖励且track只降一次', () => {
    const luna = new Luna();
    game.colonies = [luna];
    luna.trackPosition = 3; // 奖励7M€
    const mcBefore = player.megaCredits;
    luna.trade(player);
    runAllActions(game);
    // 自己获得7+7=14M€
    expect(player.megaCredits - mcBefore).to.eq(14);
    // track 只降一次
    expect(luna.trackPosition).to.eq(luna.colonies.length);
  });

  it('对手作为本回合第一个贸易者时，自己获得一次奖励且track只降一次', () => {
    const luna = new Luna();
    game.colonies = [luna];
    luna.trackPosition = 4; // 奖励10M€
    const mcBefore = player.megaCredits;
    const mcBeforeOpponent = opponent.megaCredits;
    luna.trade(opponent);
    runAllActions(game);
    // 对手获得10M€，自己获得10M€
    expect(opponent.megaCredits - mcBeforeOpponent).to.eq(10);
    expect(player.megaCredits - mcBefore).to.eq(10);
    // track 只降一次
    expect(luna.trackPosition).to.eq(luna.colonies.length);
  });

  it('本回合已有人贸易后再贸易，不再触发TradeNavigator', () => {
    const luna = new Luna();
    game.colonies = [luna];
    luna.trackPosition = 2; // 奖励4M€
    // 先由对手贸易
    luna.trade(opponent);
    runAllActions(game);


    // 再由自己贸易
    const ceres = new Ceres();
    game.colonies = [ceres];
    ceres.trackPosition = 5; // 8钢
    const steelBefore = player.steel;
    ceres.trade(player);
    runAllActions(game);
    // 只获得8钢，没有额外奖励
    expect(player.steel - steelBefore).to.eq(8); // 8
  });

  it('不同殖民地奖励类型与数量完全贴合源码', () => {
    // Ceres: 奖励钢铁
    const ceres = new Ceres();
    game.colonies = [ceres];
    ceres.trackPosition = 5; // 8钢
    const steelBefore = player.steel;
    ceres.trade(player);
    runAllActions(game);
    expect(player.steel - steelBefore).to.eq(16); // 8*2

    finishGeneration(game);
    runAllActions(game);

    // Callisto: 奖励能量
    const callisto = new Callisto();
    game.colonies = [callisto];
    callisto.trackPosition = 4; // 7能量
    const energyBefore = player.energy;
    callisto.trade(player);
    runAllActions(game);
    expect(player.energy - energyBefore).to.eq(14); // 7*2
  });
});
