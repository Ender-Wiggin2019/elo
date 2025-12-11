import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {HydrothermalVentArchaea} from '../../../src/server/cards/eros/HydrothermalVentArchaea';
import {IGame} from '../../../src/server/IGame';
import {addOcean, setTemperature} from '../../TestingUtils';

// 假设游戏内提升温度会自动触发卡牌的 onGlobalParameterIncrease

describe('HydrothermalVentArchaea', function() {
  let card: HydrothermalVentArchaea;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(function() {
    card = new HydrothermalVentArchaea();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay ', function() {
    expect(card.canPlay(player)).to.be.false;
    addOcean(player);
    addOcean(player);
    expect(card.canPlay(player)).to.be.false;
    addOcean(player);
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 能正常加入打出卡区', function() {
    player.playCard(card);
    expect(player.playedCards.has(card.name)).to.be.true;
  });

  it('每当提升温度时，自动给本牌加一个微生物', function() {
    player.playCard(card);
    const before = card.resourceCount;
    // 提升温度
    setTemperature(game, game.getTemperature() + 2); // 假设+2会触发一次温度提升
    // 触发温度提升流程
    game.increaseTemperature(player, 1);
    expect(card.resourceCount).to.equal(before + 1);
  });
});
