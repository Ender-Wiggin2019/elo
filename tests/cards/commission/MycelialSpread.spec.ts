import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {CardResource} from '../../../src/common/CardResource';
import {Tag} from '../../../src/common/cards/Tag';
import {Payment} from '../../../src/common/inputs/Payment';
import {deserializeProjectCard, serializeProjectCard} from '../../../src/server/cards/CardSerialization';
import {MycelialSpread} from '../../../src/server/cards/commission/MycelialSpread';
import {fakeCard, formatMessage, loadGameFromJSON, runAllActions, testGame} from '../../TestingUtils';

describe('MycelialSpread', () => {
  it('has the expected card properties', () => {
    const card = new MycelialSpread();
    expect(card.type).eq(CardType.ACTIVE);
    expect(card.cost).eq(11);
    expect(card.tags).deep.eq([Tag.MICROBE]);
    expect(card.resourceType).eq(CardResource.DISEASE);
    expect(card.victoryPoints).eq(1);
    expect(card.metadata.cardNumber).eq('XB78');
  });

  it('adds one disease per microbe tag, including non-card tags', () => {
    const card = new MycelialSpread();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    card.onCardPlayed(player, card);
    expect(card.resourceCount).eq(1);

    card.onCardPlayed(player, fakeCard({tags: [Tag.MICROBE, Tag.MICROBE]}));
    expect(card.resourceCount).eq(3);

    card.onNonCardTagAdded(player, Tag.MICROBE);
    expect(card.resourceCount).eq(4);
    card.onNonCardTagAdded(player, Tag.PLANT);
    expect(card.resourceCount).eq(4);
  });

  it('gains a disease from a real play of itself and logs the resource', () => {
    const [game, player] = testGame(1);
    const card = new MycelialSpread();
    player.megaCredits = card.cost;
    player.cardsInHand = [card];
    const logLength = game.gameLog.length;

    player.playCard(card);
    runAllActions(game);

    expect(card.resourceCount).eq(1);
    expect(game.gameLog.length).gt(logLength);
    expect(game.gameLog.some((entry) => {
      const message = formatMessage(entry);
      return message.includes('added 1 Disease') && message.includes(CardName.MYCELIAL_SPREAD);
    })).is.true;
  });

  it('only lets diseases pay for Jovian or Mars cards', () => {
    const [game, player] = testGame(1);
    const card = new MycelialSpread();
    player.playedCards.push(card);
    card.resourceCount = 2;
    player.megaCredits = 0;

    const jovian = fakeCard({cost: 8, tags: [Tag.JOVIAN]});
    const other = fakeCard({cost: 4, tags: [Tag.BUILDING]});
    const jovianOptions = player.affordOptionsForCard(jovian);
    const otherOptions = player.affordOptionsForCard(other);
    expect(jovianOptions.diseases).is.true;
    expect(otherOptions.diseases).is.false;
    expect(player.payingAmount(Payment.of({diseases: 2}), jovianOptions)).eq(8);

    player.cardsInHand = [jovian];
    player.checkPaymentAndPlayCard(jovian, Payment.of({diseases: 2}));
    runAllActions(game);
    expect(card.resourceCount).eq(0);

    card.resourceCount = 1;
    const mars = fakeCard({cost: 4, tags: [Tag.MARS]});
    player.cardsInHand = [mars];
    player.checkPaymentAndPlayCard(mars, Payment.of({diseases: 1}));
    runAllActions(game);
    expect(card.resourceCount).eq(0);

    card.resourceCount = 1;
    expect(() => player.checkPaymentAndPlayCard(other, Payment.of({diseases: 1}))).to.throw('Did not spend enough');
    expect(card.resourceCount).eq(1);
  });

  it('serializes and reloads disease resources through the card finder', () => {
    const [game, player] = testGame(1);
    const card = new MycelialSpread();
    player.playedCards.push(card);
    card.resourceCount = 3;

    const serializedCard = serializeProjectCard(card);
    const restoredCard = deserializeProjectCard(serializedCard);
    expect(restoredCard.name).eq(CardName.MYCELIAL_SPREAD);
    expect(restoredCard.resourceCount).eq(3);

    const restoredGame = loadGameFromJSON(game.serialize());
    const restoredPlayer = restoredGame.players[0];
    const gameCard = restoredPlayer.playedCards.get(CardName.MYCELIAL_SPREAD);
    expect(gameCard).to.exist;
    expect(gameCard?.resourceCount).eq(3);
  });
});
