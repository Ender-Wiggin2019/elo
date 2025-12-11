import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {RespirationEnhance} from '../../../src/server/cards/eros/RespirationEnhance';
import {addGreenery} from '../../TestingUtils';
import {cast} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {Resource} from '../../../src/common/Resource';
import {IGame} from '../../../src/server/IGame';
import {setOxygenLevel} from '../../TestingUtils';
import * as constants from '../../../src/common/constants';

describe('RespirationEnhance', function() {
  let card: RespirationEnhance;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new RespirationEnhance();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 总是可以打出', function() {
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 后续绿植放置时可选加温度而非氧气', function() {
    player.playCard(card);
    player.stock.add(Resource.PLANTS, 8);
    const tempBefore = game.getTemperature();
    const oxyBefore = game.getOxygenLevel();
    // 放置绿植
    addGreenery(player);
    // 检查deferred action
    const deferredAction = game.deferredActions.pop();
    expect(deferredAction).to.exist;
    const input = deferredAction!.execute();
    const orOptions = cast(input, OrOptions);
    expect(orOptions.options).to.have.length(2);
    // 选择加温度
    const tempOption = orOptions.options.find((opt) => opt.title === 'Increase temperature');
    expect(tempOption).to.exist;
    tempOption!.cb(undefined);
    expect(game.getTemperature()).to.equal(tempBefore + 2);
    expect(game.getOxygenLevel()).to.equal(oxyBefore);
  });

  it('氧气已满时只能加温度', function() {
    player.playCard(card);
    player.stock.add(Resource.PLANTS, 8);
    // 设置氧气为最大值
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    const tempBefore = game.getTemperature();
    // 放置绿植
    addGreenery(player);
    // 检查deferred action
    const deferredAction = game.deferredActions.pop();
    expect(deferredAction).to.exist;
    const input = deferredAction!.execute();
    const orOptions = cast(input, OrOptions);
    expect(orOptions.options).to.have.length(2);
    // 选择加温度
    const tempOption = orOptions.options.find((opt) => opt.title === 'Increase temperature');
    expect(tempOption).to.exist;
    tempOption!.cb(undefined);
    expect(game.getTemperature()).to.equal(tempBefore + 2);
  });

  it('序列化/反序列化后效果保留', function() {
    player.playCard(card);
    player.stock.add(Resource.PLANTS, 8);
    // 序列化
    const serialized = game.serialize();
    const deserialized = game.loadFromJSON(serialized);
    const deserializedPlayer = deserialized.players[0];
    // 检查反序列化后卡牌依然存在
    expect(deserializedPlayer.playedCards.get(card.name)).to.exist;
    // 放置绿植，检查效果依然存在
    deserialized.addGreenery(deserializedPlayer, deserialized.board.spaces[0]);
    const deferredAction = deserialized.deferredActions.pop();
    expect(deferredAction).to.exist;
  });
});
