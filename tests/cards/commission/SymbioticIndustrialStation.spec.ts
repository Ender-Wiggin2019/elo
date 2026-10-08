import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {PlanetaryMeteorHarvesters} from '../../../src/server/cards/commission/PlanetaryMeteorHarvesters';
import {SymbioticIndustrialStation} from '../../../src/server/cards/commission/SymbioticIndustrialStation';
import {serializeProjectCard} from '../../../src/server/cards/CardSerialization';
import {cast} from '../../../src/common/utils/utils';
import {testGame} from '../../TestGame';

describe('SymbioticIndustrialStation', () => {
  let card: SymbioticIndustrialStation;
  let player: ReturnType<typeof testGame>[1];

  beforeEach(() => {
    [/* game */, player] = testGame(1);
    card = new SymbioticIndustrialStation();
    player.megaCredits = 100;
    player.playCard(card);
  });

  it('offers steel conversions and gains plants', () => {
    player.steel = 3;
    const action = cast(card.action(player), OrOptions);
    expect(action.options).has.lengthOf(3);

    action.options[0].cb();
    expect(player.steel).to.eq(0);
    expect(player.plants).to.eq(4);
  });

  it('stores VP in serializable card data', () => {
    player.steel = 1;
    expect(card.action(player)).to.be.undefined;

    expect(card.data.victoryPoints).to.eq(1);
    expect(card.getVictoryPoints(player)).to.eq(1);
    expect(serializeProjectCard(card).data).to.deep.eq({victoryPoints: 1});
  });

  it('adds an asteroid to another card', () => {
    const target = new PlanetaryMeteorHarvesters();
    player.playedCards.push(target);
    player.steel = 1;

    const action = cast(card.action(player), OrOptions);
    expect(action.options).has.lengthOf(2);
    action.options[1].cb();

    expect(target.resourceType).to.eq(CardResource.ASTEROID);
    expect(target.resourceCount).to.eq(1);
    expect(player.steel).to.eq(0);
  });

  it('cannot act without steel even when an asteroid target exists', () => {
    const target = new PlanetaryMeteorHarvesters();
    player.playedCards.push(target);

    expect(card.canAct(player)).to.be.false;
    expect(card.action(player)).to.be.undefined;
    expect(player.plants).to.eq(0);
    expect(player.titanium).to.eq(0);
  });
});
