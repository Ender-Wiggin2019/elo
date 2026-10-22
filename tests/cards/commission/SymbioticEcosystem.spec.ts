import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Birds} from '../../../src/server/cards/base/Birds';
import {SmallAnimals} from '../../../src/server/cards/base/SmallAnimals';
import {SymbioticEcosystem} from '../../../src/server/cards/commission/SymbioticEcosystem';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';
import {fakeCard, formatMessage, runAllActions, setRulingParty, testGame} from '../../TestingUtils';

describe('SymbioticEcosystem', () => {
  it('has the expected card properties', () => {
    const card = new SymbioticEcosystem();

    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.name).to.eq(CardName.SYMBIOTIC_ECOSYSTEM);
    expect(card.cost).to.eq(6);
    expect(card.tags).to.deep.eq([Tag.MICROBE]);
    expect(card.resourceType).to.eq(CardResource.MICROBE);
    expect(card.victoryPoints).to.deep.eq({resourcesHere: {}, per: 3});
    expect(card.requirements).to.deep.eq([{party: PartyName.GREENS, count: undefined}]);
    expect(card.metadata.cardNumber).to.eq('XB82');
  });

  it('requires Greens to be ruling or supported', () => {
    const card = new SymbioticEcosystem();
    const [game, player] = testGame(1, {turmoilExtension: true});
    player.megaCredits = card.cost;

    setRulingParty(game, PartyName.MARS);
    expect(card.canPlay(player)).to.be.false;

    setRulingParty(game, PartyName.GREENS);
    expect(card.canPlay(player)).to.be.true;
  });

  it('adds one microbe for each microbe tag, including itself, with a source log', () => {
    const card = new SymbioticEcosystem();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    game.gameLog.length = 0;

    card.onCardPlayed(player, fakeCard({tags: [Tag.MICROBE, Tag.MICROBE]}));
    card.onCardPlayed(player, card);

    expect(card.resourceCount).to.eq(3);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`from ${CardName.SYMBIOTIC_ECOSYSTEM}`))).to.have.length(2);
  });

  it('adds one microbe for its own non-card microbe tag only, with a source log', () => {
    const card = new SymbioticEcosystem();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    game.gameLog.length = 0;

    card.onNonCardTagAdded(player, Tag.MICROBE);
    card.onNonCardTagAdded(player, Tag.SCIENCE);

    expect(card.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`from ${CardName.SYMBIOTIC_ECOSYSTEM}`))).to.have.length(1);
  });

  it('gains 2 plants when no other animal card is available', () => {
    const card = new SymbioticEcosystem();
    const [game, player] = testGame(1);
    player.playedCards.push(card);
    card.resourceCount = 1;
    game.gameLog.length = 0;

    expect(card.canAct(player)).to.be.true;
    expect(card.action(player)).to.be.undefined;

    expect(card.resourceCount).to.eq(0);
    expect(player.plants).to.eq(2);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue removed 1 resource(s) from blue's ${CardName.SYMBIOTIC_ECOSYSTEM}`)).to.have.length(1);
    expect(game.gameLog.some((entry) => formatMessage(entry) === `blue gained 2 plants because of ${CardName.SYMBIOTIC_ECOSYSTEM}`)).to.be.true;
  });

  it('can add an animal to another card and spends one microbe', () => {
    const card = new SymbioticEcosystem();
    const target = new Birds();
    const [game, player] = testGame(1);
    player.playedCards.push(card, target);
    card.resourceCount = 1;
    game.gameLog.length = 0;

    const action = cast(card.action(player), OrOptions);
    expect(action.options).to.have.length(2);
    action.options[1].cb();

    expect(card.resourceCount).to.eq(0);
    expect(target.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue removed 1 resource(s) from blue's ${CardName.SYMBIOTIC_ECOSYSTEM}`)).to.have.length(1);
    expect(game.gameLog.some((entry) => formatMessage(entry).includes(`added 1 Animal to Birds from ${CardName.SYMBIOTIC_ECOSYSTEM}`))).to.be.true;
  });

  it('requires a microbe to act', () => {
    const card = new SymbioticEcosystem();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    expect(card.canAct(player)).to.be.false;
    expect(card.action(player)).to.be.undefined;
  });

  it('counts the microbe on a real play of itself', () => {
    const card = new SymbioticEcosystem();
    const [game, player] = testGame(1, {turmoilExtension: true});
    setRulingParty(game, PartyName.GREENS);
    player.megaCredits = card.cost;
    player.cardsInHand = [card];

    player.playCard(card);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
  });

  it('selects among multiple animal cards', () => {
    const card = new SymbioticEcosystem();
    const target1 = new Birds();
    const target2 = new SmallAnimals();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card, target1, target2);
    card.resourceCount = 1;

    const action = cast(card.action(player), OrOptions);
    const targetSelection = cast(action.options[1], SelectCard);
    expect(targetSelection.cards).to.have.members([target1, target2]);
    targetSelection.cb([target2]);

    expect(card.resourceCount).to.eq(0);
    expect(target1.resourceCount).to.eq(0);
    expect(target2.resourceCount).to.eq(1);
  });
});
