import {expect} from 'chai';
import {ShadowCabinet} from '../../../src/server/cards/commission/ShadowCabinet';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {IndenturedWorkers} from '../../../src/server/cards/base/IndenturedWorkers';
import {ConstructionAid} from '../../../src/server/cards/commission/ConstructionAid';
import {Payment} from '../../../src/common/inputs/Payment';

describe('ShadowCabinet', () => {
  let card: ShadowCabinet;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ShadowCabinet();
    [, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('has the expected properties', () => {
    expect(card.cost).to.eq(4);
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.EARTH]);
    expect(card.victoryPoints).to.eq(-1);
  });

  it('gains 4 M€ for itself and each played negative VP card', () => {
    player.playCard(card, Payment.of({megacredits: 4}));
    runAllActions(player.game);
    expect(player.megaCredits).to.eq(100); // 100 - 4 + 4 for Shadow Cabinet itself.

    player.playCard(new IndenturedWorkers());
    runAllActions(player.game);
    expect(player.megaCredits).to.eq(104);
  });

  it('does not trigger for a card without a negative static VP value', () => {
    player.playCard(card, Payment.of({megacredits: 4}));
    runAllActions(player.game);
    const before = player.megaCredits;

    player.playCard(new ConstructionAid(), Payment.of({megacredits: 12}));
    runAllActions(player.game);

    expect(player.megaCredits).to.eq(before - 12);
  });
});
