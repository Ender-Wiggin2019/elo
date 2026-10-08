import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {DustCombustion} from '../../../src/server/cards/commission/DustCombustion';
import {fakeCard, runAllActions, setOxygenLevel, setTemperature, setRulingParty, testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {MAX_TEMPERATURE} from '../../../src/common/constants';

describe('DustCombustion', () => {
  let card: DustCombustion;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new DustCombustion();
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
    setOxygenLevel(game, 8);
  });

  it('has the commissioned card properties', () => {
    expect(card.type).to.eq(CardType.AUTOMATED);
    expect(card.cost).to.eq(9);
    expect(card.tags).to.deep.eq([Tag.VENUS, Tag.SPACE]);
    expect(card.victoryPoints).to.eq(-1);
    expect(card.requirements[0].oxygen).to.eq(8);
  });

  it('requires a floater and applies both global changes when played', () => {
    const floaterCard = fakeCard({resourceType: CardResource.FLOATER, resourceCount: 1});
    player.playedCards.push(floaterCard);
    player.megaCredits = card.cost;

    expect(player.canPlay(card)).to.be.true;

    const oldTemperature = game.getTemperature();
    player.playCard(card);
    runAllActions(game);

    expect(floaterCard.resourceCount).to.eq(0);
    expect(game.getOxygenLevel()).to.eq(7);
    expect(game.getTemperature()).to.eq(oldTemperature + 4);
  });

  it('cannot be played without a floater', () => {
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).to.be.false;
  });

  it('charges Reds for the temperature increase without offsetting it by the oxygen decrease', () => {
    const floaterCard = fakeCard({resourceType: CardResource.FLOATER, resourceCount: 1});
    player.playedCards.push(floaterCard);
    setRulingParty(game, PartyName.REDS);
    player.megaCredits = card.cost + 6 - 1;
    expect(player.canPlay(card)).to.be.false;

    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).to.be.true;
    expect(card.additionalProjectCosts).to.deep.eq({redsCost: 6});
  });

  it('does not raise temperature above the global ceiling', () => {
    const floaterCard = fakeCard({resourceType: CardResource.FLOATER, resourceCount: 1});
    player.playedCards.push(floaterCard);
    setTemperature(game, MAX_TEMPERATURE);

    player.playCard(card);
    runAllActions(game);

    expect(floaterCard.resourceCount).to.eq(0);
    expect(game.getTemperature()).to.eq(MAX_TEMPERATURE);
  });
});
