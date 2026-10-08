import {expect} from 'chai';
import {Ants} from '../../../src/server/cards/base/Ants';
import {BiomassCombustors} from '../../../src/server/cards/base/BiomassCombustors';
import {DustSeals} from '../../../src/server/cards/base/DustSeals';
import {LavaFlows} from '../../../src/server/cards/base/LavaFlows';
import {ScienceTagCard} from '../../../src/server/cards/community/ScienceTagCard';
import {AncientShipyards} from '../../../src/server/cards/moon/AncientShipyards';
import {GridOptimization} from '../../../src/server/cards/commission/GridOptimization';
import {testGame} from '../../TestGame';

describe('GridOptimization', () => {
  it('requires 2 power tags', () => {
    const card = new GridOptimization();
    const [/* game */, player] = testGame(1);
    player.megaCredits = 100;

    expect(card.canPlay(player)).to.be.false;
    player.tagsForTest = {power: 1};
    expect(card.canPlay(player)).to.be.false;
    player.tagsForTest = {power: 2};
    expect(card.canPlay(player)).to.be.true;
  });

  it('gives 1 M€ for cards without a VP icon, including itself', () => {
    const card = new GridOptimization();
    const [/* game */, player] = testGame(1);
    player.megaCredits = 100;
    player.tagsForTest = {power: 2};

    expect(card.metadata.victoryPoints).to.be.undefined;
    player.playCard(card);
    expect(player.megaCredits).to.eq(101);

    card.onCardPlayed(player, new LavaFlows());
    expect(player.megaCredits).to.eq(102);
  });

  it('does not pay for static or dynamic VP cards, or the blank science proxy', () => {
    const card = new GridOptimization();
    const [/* game */, player] = testGame(1);
    player.megaCredits = 100;

    const dynamicZero = new Ants();
    const dynamicPositive = new Ants();
    dynamicPositive.resourceCount = 2;
    const dynamicNegative = new AncientShipyards();
    dynamicNegative.resourceCount = 1;

    card.onCardPlayed(player, dynamicZero);
    card.onCardPlayed(player, dynamicPositive);
    card.onCardPlayed(player, dynamicNegative);
    card.onCardPlayed(player, new DustSeals());
    card.onCardPlayed(player, new BiomassCombustors());
    card.onCardPlayed(player, new ScienceTagCard());

    expect(player.megaCredits).to.eq(100);
  });
});
