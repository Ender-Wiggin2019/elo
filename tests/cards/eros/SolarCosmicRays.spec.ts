import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SolarCosmicRays} from '../../../src/server/cards/eros/SolarCosmicRays';
import {Resource} from '../../../src/common/Resource';
import {PowerPlant} from '../../../src/server/cards/base/PowerPlant';

describe('SolarCosmicRays', function() {
  let card: SolarCosmicRays;
  let player: TestPlayer;
  let other: TestPlayer;

  beforeEach(() => {
    card = new SolarCosmicRays();
    [, player, other] = testGame(2, {skipInitialShuffling: true});
  });

  it('play 增加自己1能量产出，根据其他玩家能量产出增加热量产出', function() {
    // 让对手有能量产出
    other.playCard(new PowerPlant()); // 这张牌有能量产出
    player.playCard(card);
    expect(player.production.get(Resource.ENERGY)).to.equal(1);
    expect(player.production.get(Resource.HEAT)).to.equal(1); // other能量产出为1
  });

  it('play 热量产出最多加15', function() {
    // 让对手能量产出很高
    other.production.add(Resource.ENERGY, 20);
    player.playCard(card);
    expect(player.production.get(Resource.HEAT)).to.equal(15);
  });
});
