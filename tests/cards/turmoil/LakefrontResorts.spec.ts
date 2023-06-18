import {expect} from 'chai';
import {LakefrontResorts} from '../../../src/server/cards/turmoil/LakefrontResorts';
import {addOceanTile, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('LakefrontResorts', function() {
  it('Should play', function() {
    const card = new LakefrontResorts();
    const [game, player] = testGame(2);
    const play = card.play(player);

    expect(play).is.undefined;

    player.setCorporationForTest(card);
    addOceanTile(player, '06');
    addOceanTile(player, '07');
    runAllActions(game);

    expect(player.production.megacredits).to.eq(2);
    // The 2 oceans are adjacent
    expect(player.megaCredits).to.eq(3);
  });
});
