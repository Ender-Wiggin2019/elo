import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {WGPartnership} from '../../../src/server/cards/eros/WGPartnership';
import {IGame} from '../../../src/server/IGame';
import {Phase} from '../../../src/common/Phase';


describe('WGPartnership', function() {
  let card: WGPartnership;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new WGPartnership();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 总是可以打出', function() {
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 能正常加入打出卡区', function() {
    player.playCard(card);
    expect(player.playedCards.get(card.name)).to.deep.equal(card);
  });

  it('打出后game.wgPartnershipOwner为当前玩家', function() {
    player.playCard(card);
    expect(game.wgPartnershipOwner).to.equal(player);
  });

  it('世界政府加成流程中加成归属该玩家（TR提升）', function() {
    player.playCard(card);
    // 进入SOLAR阶段，模拟世界政府加成
    game.phase = Phase.SOLAR;
    const trBefore = player.terraformRating;
    // 触发加氧气
    game.increaseOxygenLevel(player, 1);
    expect(player.terraformRating).to.equal(trBefore + 1);
    // 触发加温度
    const tempBefore = player.terraformRating;
    game.increaseTemperature(player, 1);
    expect(player.terraformRating).to.equal(tempBefore + 1);
    // 触发加金星
    const venusBefore = player.terraformRating;
    game.increaseVenusScaleLevel(player, 1);
    expect(player.terraformRating).to.equal(venusBefore + 1);
  });

  it('序列化/反序列化后owner信息保留', function() {
    player.playCard(card);
    game.phase = Phase.SOLAR;
    // 触发一次加成
    game.increaseOxygenLevel(player, 1);
    // 序列化
    const serialized = game.serialize();
    const deserialized = game.loadFromJSON(serialized);
    // 断言反序列化后owner仍为player
    // 注意：player对象已变，需通过id判断
    expect(deserialized.wgPartnershipOwner?.id).to.equal(player.id);
  });
});
