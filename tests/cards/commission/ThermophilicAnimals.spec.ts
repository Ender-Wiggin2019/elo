import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {CardResource} from '../../../src/common/CardResource';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Resource} from '../../../src/common/Resource';
import {ThermophilicAnimals} from '../../../src/server/cards/commission/ThermophilicAnimals';
import {setRulingParty, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('ThermophilicAnimals', () => {
  it('requires Kelvinists and has the expected animal action', () => {
    const card = new ThermophilicAnimals();
    const [game, player] = testGame(1, {turmoilExtension: true});
    player.megaCredits = 100;

    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.cost).to.eq(8);
    expect(card.resourceType).to.eq(CardResource.ANIMAL);
    expect(card.canPlay(player)).to.be.false;

    setRulingParty(game, PartyName.KELVINISTS);
    expect(card.canPlay(player)).to.be.true;

    player.playCard(card);
    player.stock.add(Resource.HEAT, 2);
    const priorMegaCredits = player.megaCredits;

    expect(card.canAct(player)).to.be.true;
    card.action(player);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    expect(player.megaCredits).to.eq(priorMegaCredits + 5);
    expect(card.getVictoryPoints(player)).to.eq(0);

    card.resourceCount = 2;
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('cannot act without 2 available heat', () => {
    const card = new ThermophilicAnimals();
    const [game, player] = testGame(1, {turmoilExtension: true});
    setRulingParty(game, PartyName.KELVINISTS);
    player.playCard(card);

    player.heat = 1;
    expect(card.canAct(player)).to.be.false;
  });
});
