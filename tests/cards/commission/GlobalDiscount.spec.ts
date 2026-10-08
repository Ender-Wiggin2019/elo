import {expect} from 'chai';
import {Resource} from '../../../src/common/Resource';
import {GlobalDiscount} from '../../../src/server/cards/commission/GlobalDiscount';
import {MediaGroup} from '../../../src/server/cards/base/MediaGroup';
import {EarthCatapult} from '../../../src/server/cards/base/EarthCatapult';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast, churn} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('GlobalDiscount', () => {
  it('scores 1 VP per 3 Earth tags including itself', () => {
    const card = new GlobalDiscount();
    const [/* game */, player] = testGame(1);
    player.megaCredits = 100;

    player.playCard(card);
    player.playCard(new MediaGroup());
    player.playCard(new EarthCatapult());

    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('trades one production for MC through either action option', () => {
    const card = new GlobalDiscount();
    const [/* game */, player] = testGame(1);
    player.megaCredits = 100;
    player.playCard(card);
    player.production.add(Resource.STEEL, 1);
    player.production.add(Resource.HEAT, 1);

    const action = cast(churn(card.action(player), player), OrOptions);
    expect(action.options).has.lengthOf(2);

    const priorMegaCredits = player.megaCredits;
    action.options[0].cb();
    expect(player.production.steel).to.eq(0);
    expect(player.megaCredits).to.eq(priorMegaCredits + 6);
  });

  it('cannot act without steel or heat production', () => {
    const card = new GlobalDiscount();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    expect(card.canAct(player)).to.be.false;
  });
});
