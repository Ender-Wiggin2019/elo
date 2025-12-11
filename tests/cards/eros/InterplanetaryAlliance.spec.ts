import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {InterplanetaryAlliance} from '../../../src/server/cards/eros/InterplanetaryAlliance';
import {AerialMappers} from '../../../src/server/cards/venusNext/AerialMappers'; // Venus标签
import {WGPartnership} from '../../../src/server/cards/eros/WGPartnership'; // Earth标签
import {CallistoPenalMines} from '../../../src/server/cards/base/CallistoPenalMines'; // Jovian标签

describe('InterplanetaryAlliance', function() {
  let card: InterplanetaryAlliance;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InterplanetaryAlliance();
    [, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 需要有金星、地球、木星标签', function() {
    player.playCard(new AerialMappers()); // Venus
    expect(card.canPlay(player)).to.be.false;
    player.playCard(new WGPartnership()); // Earth
    expect(card.canPlay(player)).to.be.false;
    player.playCard(new CallistoPenalMines()); // Jovian
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 只加分，无其他效果', function() {
    player.playCard(new AerialMappers()); // 1vp
    player.playCard(new WGPartnership());
    player.playCard(new CallistoPenalMines()); // 2vp
    player.playCard(card);
    // 只加1分
    expect(player.getVictoryPoints().victoryPoints).to.equal(1+2+1);
  });
});
