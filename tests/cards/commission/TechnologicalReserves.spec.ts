import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {TechnologicalReserves} from '../../../src/server/cards/commission/TechnologicalReserves';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('TechnologicalReserves', () => {
  let card: TechnologicalReserves;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new TechnologicalReserves();
    [, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
  });

  it('is an automated card with no tags and costs 15 M€', () => {
    expect(card.type).to.eq(CardType.AUTOMATED);
    expect(card.cost).to.eq(15);
    expect(card.tags).to.deep.eq([]);
    expect(card.metadata.cardNumber).to.eq('XB88');
  });

  it('scores 1 VP for every 3 unplayed cards in its owner hand', () => {
    otherPlayer.cardsInHand = Array.from({length: 9}, () => fakeCard());
    for (const count of [0, 1, 2, 3, 5, 6, 8, 9]) {
      player.cardsInHand = Array.from({length: count}, () => fakeCard());
      expect(card.getVictoryPoints(player)).to.eq(Math.floor(count / 3));
    }
  });
});
