import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {Payment} from '../../../src/common/inputs/Payment';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {testGame, formatMessage, runAllActions, setRulingParty, fakeCard} from '../../TestingUtils';
import {GeothermalSmelter} from '../../../src/server/cards/commission/GeothermalSmelter';
import {Mine} from '../../../src/server/cards/base/Mine';
import {Research} from '../../../src/server/cards/base/Research';

describe('GeothermalSmelter', () => {
  it('has the expected card properties', () => {
    const card = new GeothermalSmelter();
    expect(card.type).eq(CardType.ACTIVE);
    expect(card.cost).eq(7);
    expect(card.tags).deep.eq([Tag.BUILDING]);
    expect(card.metadata.cardNumber).eq('XB77');
  });

  it('requires Mars First ruling or two Mars First delegates', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    const card = new GeothermalSmelter();
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.MARS);
    expect(card.canPlay(player)).is.true;

    const [delegateGame, delegatePlayer] = testGame(1, {turmoilExtension: true});
    const mars = delegateGame.turmoil!.getPartyByName(PartyName.MARS);
    mars.delegates.add(delegatePlayer, 2);
    expect(card.canPlay(delegatePlayer)).is.true;
  });

  it('uses heat at 2 M€ only for building cards', () => {
    const [/* game */, player] = testGame(1, {turmoilExtension: true});
    player.playedCards.push(new GeothermalSmelter());

    const building = new Mine();
    const buildingOptions = player.affordOptionsForCard(building);
    expect(buildingOptions.geothermalSmelterHeat).is.true;
    expect(player.payingAmount(Payment.of({heat: 1}), buildingOptions)).eq(2);

    const nonBuilding = new Research();
    const nonBuildingOptions = player.affordOptionsForCard(nonBuilding);
    expect(nonBuildingOptions.geothermalSmelterHeat).is.false;
    expect(player.payingAmount(Payment.of({heat: 1}), nonBuildingOptions)).eq(0);
  });

  it('does not change Helion heat value for non-building cards', () => {
    const [/* game */, player] = testGame(1, {turmoilExtension: true});
    player.canUseHeatAsMegaCredits = true;
    player.playedCards.push(new GeothermalSmelter());

    const nonBuildingOptions = player.affordOptionsForCard(new Research());
    expect(nonBuildingOptions.heat).is.true;
    expect(nonBuildingOptions.geothermalSmelterHeat).is.false;
    expect(player.payingAmount(Payment.of({heat: 1}), nonBuildingOptions)).eq(1);
  });

  it('accepts heat as a real payment for a building card', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    player.playedCards.push(new GeothermalSmelter());

    const building = new Mine();
    player.cardsInHand = [building];
    player.heat = 1;
    player.megaCredits = 2;

    player.checkPaymentAndPlayCard(building, Payment.of({heat: 1, megacredits: 2}));
    runAllActions(game);

    expect(player.playedCards.has(CardName.MINE)).is.true;
    expect(player.heat).eq(0);
    expect(player.megaCredits).eq(0);
  });

  it('plays its production and records the play in the game log', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    const card = new GeothermalSmelter();
    player.cardsInHand = [card];
    const logLength = game.gameLog.length;

    player.playCard(card);
    runAllActions(game);

    expect(player.production.heat).eq(1);
    expect(game.gameLog.length).gt(logLength);
    expect(game.gameLog.some((entry) => formatMessage(entry) === 'blue gained 1 heat production')).is.true;
  });

  it('does not promise a card and Reds policy payment from the same heat', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.canUseHeatAsMegaCredits = true;
    player.playedCards.push(new GeothermalSmelter());

    const card = fakeCard({cost: 6, tags: [Tag.BUILDING], tr: {temperature: 1}});
    player.heat = 5;
    expect(player.canPlay(card)).is.false;

    player.heat = 6;
    expect(player.canPlay(card)).is.true;
  });

  it('rejects a Geothermal payment that spends the Reds policy reserve', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.canUseHeatAsMegaCredits = true;
    player.playedCards.push(new GeothermalSmelter());

    const card = fakeCard({cost: 6, tags: [Tag.BUILDING], tr: {temperature: 1}});
    player.cardsInHand = [card];
    player.megaCredits = 3;
    player.heat = 3;
    expect(player.canPlay(card)).is.true;

    expect(() => player.checkPaymentAndPlayCard(card, Payment.of({megacredits: 2, heat: 2}))).to.throw('Reds policy cost');
    expect(player.megaCredits).eq(3);
    expect(player.heat).eq(3);
    expect(player.cardsInHand).contains(card);
    expect(player.playedCards.has(card.name)).is.false;

    player.checkPaymentAndPlayCard(card, Payment.of({heat: 3}));
    runAllActions(game);
    expect(player.playedCards.has(card.name)).is.true;
    expect(player.megaCredits).eq(3);
    expect(player.heat).eq(0);

    player.increaseTerraformRating();
    runAllActions(game);
    expect(player.megaCredits).eq(0);
  });

  it('reserves Luna Trade Federation titanium for Reds before Geothermal payment', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.canUseTitaniumAsMegacredits = true;
    player.playedCards.push(new GeothermalSmelter());

    const card = fakeCard({cost: 6, tags: [Tag.BUILDING], tr: {temperature: 1}});
    player.canUseHeatAsMegaCredits = true;
    player.heat = 3;
    player.titanium = 2;
    expect(player.canPlay(card)).is.true;

    player.heat = 0;
    const titaniumOnlyCard = fakeCard({cost: 1, tags: [Tag.BUILDING], tr: {temperature: 1}});
    expect(player.canPlay(titaniumOnlyCard)).is.false;
  });

  it('does not reserve titanium that has no value under Luna Trade Federation', () => {
    const [game, player] = testGame(1, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS, 'rp01');
    player.canUseHeatAsMegaCredits = true;
    player.canUseTitaniumAsMegacredits = true;
    player.decreaseTitaniumValue();
    player.decreaseTitaniumValue();
    player.playedCards.push(new GeothermalSmelter());
    player.heat = 3;
    player.titanium = 3;

    const card = fakeCard({cost: 6, tags: [Tag.BUILDING], tr: {temperature: 1}});
    expect(player.canPlay(card)).is.false;
  });
});
