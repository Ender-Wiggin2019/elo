import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SisterPlanetSponsors} from '../../../src/server/cards/eros/SisterPlanetSponsors';
import {AerialMappers} from '../../../src/server/cards/venusNext/AerialMappers'; // Venus标签
import {WGPartnership} from '../../../src/server/cards/eros/WGPartnership'; // Earth标签
import {Resource} from '../../../src/common/Resource';

describe('SisterPlanetSponsors', function() {
  let card: SisterPlanetSponsors;
  let player: TestPlayer;
  let other: TestPlayer;

  beforeEach(() => {
    card = new SisterPlanetSponsors();
    [, player, other] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 需要有金星和地球标签', function() {
    // 先打出一张 Venus tag 的真实卡牌
    player.playCard(new AerialMappers());
    expect(card.canPlay(player)).to.be.false;
    // 再打出一张 Earth tag 的真实卡牌
    player.playCard(new WGPartnership());
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 增加自己4产出，所有人+1产出', function() {
    player.playCard(new AerialMappers());
    player.playCard(new WGPartnership());
    player.playCard(card);
    // 自己+3（bespokePlay里+3），所有人+1
    expect(player.production.get(Resource.MEGACREDITS)).to.equal(4);
    expect(other.production.get(Resource.MEGACREDITS)).to.equal(1);
  });
});
