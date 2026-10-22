import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {Birds} from '../../../src/server/cards/base/Birds';
import {BiotechBlueprintInnovation} from '../../../src/server/cards/commission/BiotechBlueprintInnovation';
import {fakeCard, formatMessage, testGame} from '../../TestingUtils';

describe('BiotechBlueprintInnovation', () => {
  it('has the expected card properties', () => {
    const card = new BiotechBlueprintInnovation();

    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.name).to.eq(CardName.BIOTECH_BLUEPRINT_INNOVATION);
    expect(card.cost).to.eq(12);
    expect(card.tags).to.deep.eq([Tag.SCIENCE, Tag.MICROBE]);
    expect(card.resourceType).to.eq(CardResource.MICROBE);
    expect(card.requirements).to.deep.eq([{tag: Tag.SCIENCE, count: 3}]);
    expect(card.victoryPoints).to.eq(1);
    expect(card.metadata.cardNumber).to.eq('XB83');
  });

  it('requires three science tags', () => {
    const card = new BiotechBlueprintInnovation();
    const [/* game */, player] = testGame(1);
    player.megaCredits = card.cost;
    player.tagsForTest = {[Tag.SCIENCE]: 2};
    expect(card.canPlay(player)).to.be.false;

    player.tagsForTest = {[Tag.SCIENCE]: 3};
    expect(card.canPlay(player)).to.be.true;
  });

  it('adds one microbe per science tag, including itself, with a source log', () => {
    const card = new BiotechBlueprintInnovation();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    game.gameLog.length = 0;

    card.onCardPlayed(player, fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE]}));
    card.onCardPlayed(player, card);

    expect(card.resourceCount).to.eq(3);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`from ${CardName.BIOTECH_BLUEPRINT_INNOVATION}`))).to.have.length(2);
  });

  it('adds one microbe for its own non-card science tag only, with a source log', () => {
    const card = new BiotechBlueprintInnovation();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    game.gameLog.length = 0;

    card.onNonCardTagAdded(player, Tag.SCIENCE);
    card.onNonCardTagAdded(player, Tag.MICROBE);

    expect(card.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`from ${CardName.BIOTECH_BLUEPRINT_INNOVATION}`))).to.have.length(1);
  });

  it('spends one microbe to draw an active card', () => {
    const card = new BiotechBlueprintInnovation();
    const active = new Birds();
    const event = fakeCard({type: CardType.EVENT});
    const [game, player] = testGame(1);
    game.projectDeck.drawPile = [active, event];
    game.projectDeck.discardPile = [];
    player.playedCards.push(card);
    card.resourceCount = 1;
    game.gameLog.length = 0;

    expect(card.canAct(player)).to.be.true;
    expect(card.action(player)).to.be.undefined;

    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).to.deep.eq([active]);
    expect(game.projectDeck.drawPile).to.deep.eq([event]);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue removed 1 resource(s) from blue's ${CardName.BIOTECH_BLUEPRINT_INNOVATION}`)).to.have.length(1);
    expect(game.gameLog.some((entry) => formatMessage(entry).includes('drew Birds'))).to.be.true;
  });

  it('cannot act when no active card can be drawn', () => {
    const card = new BiotechBlueprintInnovation();
    const [game, player] = testGame(1);
    game.projectDeck.drawPile = [fakeCard({type: CardType.EVENT})];
    game.projectDeck.discardPile = [];
    player.playedCards.push(card);
    card.resourceCount = 1;

    expect(card.canAct(player)).to.be.false;
    expect(card.action(player)).to.be.undefined;
    expect(card.resourceCount).to.eq(1);
    expect(player.cardsInHand).to.be.empty;
  });

  it('can draw an active card from the discard pile', () => {
    const card = new BiotechBlueprintInnovation();
    const active = new Birds();
    const [game, player] = testGame(1);
    game.projectDeck.drawPile = [];
    game.projectDeck.discardPile = [active];
    player.playedCards.push(card);
    card.resourceCount = 1;

    expect(card.canAct(player)).to.be.true;
    card.action(player);

    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).to.deep.eq([active]);
  });
});
