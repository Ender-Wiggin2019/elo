import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {UrgentTerraformingCommand} from '../../../src/server/cards/eros/UrgentTerraformingCommand';
import {Resource} from '../../../src/common/Resource';

describe('UrgentTerraformingCommand', function() {
  let card: UrgentTerraformingCommand;
  let player: TestPlayer;

  beforeEach(function() {
    card = new UrgentTerraformingCommand();
    [, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 需要TR>=25', function() {
    player.setTerraformRating(24);
    expect(card.canPlay(player)).to.be.false;
    player.setTerraformRating(25);
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 获得等于产出的植物和热量', function() {
    player.setTerraformRating(30);
    player.production.add(Resource.PLANTS, 3);
    player.production.add(Resource.HEAT, 2);
    player.playCard(card);
    expect(player.stock.get(Resource.PLANTS)).to.equal(3);
    expect(player.stock.get(Resource.HEAT)).to.equal(2);
  });
});
