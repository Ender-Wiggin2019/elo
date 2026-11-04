import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {GalileoMatrix} from '../../../src/server/cards/commission/GalileoMatrix';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, formatMessage, runAllActions, testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';

describe('GalileoMatrix', () => {
  let card: GalileoMatrix;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GalileoMatrix();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('has the expected active properties', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.name).to.eq(CardName.GALILEO_MATRIX);
    expect(card.cost).to.eq(12);
    expect(card.tags).to.deep.eq([Tag.JOVIAN, Tag.SPACE]);
    expect(card.metadata.cardNumber).to.eq('XB95');
  });

  it('gains one logged TR on play', () => {
    const startingTR = player.getTerraformRating();

    player.playCard(card);
    runAllActions(game);

    expect(player.getTerraformRating()).to.eq(startingTR + 1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry === 'blue gained 1 TR')).to.have.length(1);
  });

  it('discounts two M€ per Jovian tag on the card being played', () => {
    player.playedCards.push(card);

    expect(card.getCardDiscount(player, fakeCard({tags: []}))).to.eq(0);
    expect(card.getCardDiscount(player, fakeCard({tags: [Tag.JOVIAN]}))).to.eq(2);
    expect(card.getCardDiscount(player, fakeCard({tags: [Tag.JOVIAN, Tag.JOVIAN]}))).to.eq(4);
  });
});
