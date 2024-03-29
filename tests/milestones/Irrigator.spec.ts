import {expect} from 'chai';
import {testGame} from '../TestGame';
import {Irrigator} from '../../src/server/milestones/Irrigator';
import {addCityTile, addGreenery, maxOutOceans} from '../TestingUtils';
import {TestPlayer} from '../TestPlayer';

describe('Irrigator', () => {
  let milestone: Irrigator;
  let player: TestPlayer;

  beforeEach(() => {
    milestone = new Irrigator();
    [/* skipped */, player] = testGame(2);

    maxOutOceans(player);
  });

  it('Can claim with 4 tiles adjacent to oceans', () => {
    addCityTile(player, '09');
    addGreenery(player, '20');
    addCityTile(player, '11');
    expect(milestone.canClaim(player)).is.false;

    addGreenery(player, '24');
    expect(milestone.canClaim(player)).is.true;
  });
});
