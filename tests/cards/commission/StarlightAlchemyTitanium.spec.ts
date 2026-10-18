import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {Payment} from '../../../src/common/inputs/Payment';
import {StarlightAlchemyTitanium} from '../../../src/server/cards/commission/StarlightAlchemyTitanium';
import {AsteroidHollowing} from '../../../src/server/cards/promo/AsteroidHollowing';
import {CometAiming} from '../../../src/server/cards/promo/CometAiming';
import {Helion} from '../../../src/server/cards/corporation/Helion';
import {StormCraftIncorporated} from '../../../src/server/cards/colonies/StormCraftIncorporated';
import {LunaTradeFederation} from '../../../src/server/cards/moon/LunaTradeFederation';
import {AndOptions} from '../../../src/server/inputs/AndOptions';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {cast, formatMessage, runAllActions, testGame} from '../../TestingUtils';

describe('StarlightAlchemyTitanium', () => {
  let card: StarlightAlchemyTitanium;
  let player: TestPlayer;

  beforeEach(() => {
    card = new StarlightAlchemyTitanium();
    [/* game */, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('has the expected commissioned event properties', () => {
    expect(card.cost).to.eq(1);
    expect(card.type).to.eq(CardType.EVENT);
    expect(card.tags).to.deep.eq([]);
    expect(card.metadata.cardNumber).to.eq('XB81');
    expect(card.name).to.eq(CardName.STARLIGHT_ALCHEMY_TITANIUM);
  });

  it('cannot play without five heat reserved after paying for the card', () => {
    player.megaCredits = 1;
    player.heat = 4;
    expect(player.canPlay(card)).to.be.false;

    player.heat = 5;
    expect(player.canPlay(card)).to.be.true;
  });

  it('accounts for Helion heat when paying the card cost', () => {
    const helion = new Helion();
    player.playCorporationCard(helion);
    runAllActions(player.game);
    player.megaCredits = 0;
    player.heat = 5;
    expect(player.canPlay(card)).to.be.false;

    player.heat = 6;
    expect(player.canPlay(card)).to.be.true;
  });

  it('accounts for Stormcraft floaters when paying the card cost and effect', () => {
    const helion = new Helion();
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(helion);
    player.playCorporationCard(stormcraft);
    runAllActions(player.game);
    player.megaCredits = 0;
    player.heat = 0;

    stormcraft.resourceCount = 3;
    expect(player.canPlay(card)).to.be.false;

    stormcraft.resourceCount = 4;
    expect(player.canPlay(card)).to.be.true;
  });

  it('accepts Luna Trade Federation titanium for the card cost', () => {
    const lunaTradeFederation = new LunaTradeFederation();
    player.playCorporationCard(lunaTradeFederation);
    runAllActions(player.game);
    player.megaCredits = 0;
    player.titanium = 1;
    player.heat = 5;

    expect(player.canPlay(card)).to.be.true;
  });

  it('gains titanium after spending heat when there is no asteroid target', () => {
    player.megaCredits = 1;
    player.heat = 5;
    player.cardsInHand = [card];
    player.checkPaymentAndPlayCard(card, Payment.of({megacredits: 1}));
    runAllActions(player.game);

    expect(player.heat).to.eq(0);
    expect(player.titanium).to.eq(3);
    expect(player.playedCards.has(card.name)).to.be.true;
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue gained 3 titanium because of 🌸星火点钛🌸')).to.have.length(1);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 5 heat because of 🌸星火点钛🌸')).to.have.length(1);
  });

  it('offers titanium or one asteroid target after spending heat', () => {
    const target = new AsteroidHollowing();
    player.playedCards.push(target);
    player.heat = 5;

    const options = cast(card.play(player), OrOptions);
    expect(options.options).to.have.length(2);
    expect(player.heat).to.eq(0);

    options.options[1].cb(undefined);
    expect(target.resourceCount).to.eq(2);
    expect(player.titanium).to.eq(0);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue added 2 Asteroid(s) to Asteroid Hollowing from 🌸星火点钛🌸')).to.have.length(1);
  });

  it('lets the player choose titanium when an asteroid target exists', () => {
    const target = new AsteroidHollowing();
    player.playedCards.push(target);
    player.heat = 5;

    const options = cast(card.play(player), OrOptions);
    options.options[0].cb(undefined);

    expect(target.resourceCount).to.eq(0);
    expect(player.titanium).to.eq(3);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue gained 3 titanium because of 🌸星火点钛🌸')).to.have.length(1);
  });

  it('lets the player choose one of multiple asteroid targets', () => {
    const firstTarget = new AsteroidHollowing();
    const secondTarget = new CometAiming();
    player.playedCards.push(firstTarget, secondTarget);
    player.heat = 5;

    const options = cast(card.play(player), OrOptions);
    const targetSelection = cast(options.options[1], SelectCard);
    targetSelection.cb([secondTarget]);

    expect(firstTarget.resourceCount).to.eq(0);
    expect(secondTarget.resourceCount).to.eq(2);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue added 2 Asteroid(s) to Comet Aiming from 🌸星火点钛🌸')).to.have.length(1);
  });

  it('spends Stormcraft floaters through the heat payment input', () => {
    const stormcraft = new StormCraftIncorporated();
    player.playedCards.push(stormcraft);
    player.heat = 1;
    stormcraft.resourceCount = 2;

    const payment = cast(card.play(player), AndOptions);
    expect(payment.options).to.have.length(2);
    cast(payment.options[0], SelectAmount).cb(1);
    cast(payment.options[1], SelectAmount).cb(2);
    payment.cb(undefined);

    expect(stormcraft.resourceCount).to.eq(0);
    expect(player.heat).to.eq(0);
    expect(player.titanium).to.eq(3);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 1 heat because of 🌸星火点钛🌸')).to.have.length(1);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry).startsWith('blue removed 2 Floater(s) from Stormcraft Incorporated'))).to.have.length(1);
  });

  it('starts its heat payment after a deferred Helion card payment', () => {
    const helion = new Helion();
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(helion);
    player.playCorporationCard(stormcraft);
    runAllActions(player.game);
    player.megaCredits = 0;
    player.heat = 2;
    stormcraft.resourceCount = 2;
    player.cardsInHand = [card];

    player.checkPaymentAndPlayCard(card, Payment.of({heat: 1}));

    const cardPayment = cast(player.game.deferredActions.pop()!.execute(), AndOptions);
    cast(cardPayment.options[0], SelectAmount).cb(1);
    cast(cardPayment.options[1], SelectAmount).cb(0);
    cardPayment.cb(undefined);

    const effectPayment = cast(player.game.deferredActions.pop()!.execute(), AndOptions);
    cast(effectPayment.options[0], SelectAmount).cb(1);
    cast(effectPayment.options[1], SelectAmount).cb(2);
    effectPayment.cb(undefined);

    expect(player.heat).to.eq(0);
    expect(stormcraft.resourceCount).to.eq(0);
    expect(player.titanium).to.eq(3);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 1 heat because of 🌸星火点钛🌸')).to.have.length(1);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry).startsWith('blue removed 2 Floater(s) from Stormcraft Incorporated'))).to.have.length(1);
  });
});
