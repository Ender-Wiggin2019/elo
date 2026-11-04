import {expect} from 'chai';
import {Payment} from '../../../src/common/inputs/Payment';
import {CardResource} from '../../../src/common/CardResource';
import {CardName} from '../../../src/common/cards/CardName';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Helion} from '../../../src/server/cards/corporation/Helion';
import {LunaTradeFederation} from '../../../src/server/cards/moon/LunaTradeFederation';
import {StormCraftIncorporated} from '../../../src/server/cards/colonies/StormCraftIncorporated';
import {SpeciesPropagation} from '../../../src/server/cards/commission/SpeciesPropagation';
import {AndOptions} from '../../../src/server/inputs/AndOptions';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {cast} from '../../../src/common/utils/utils';
import {formatMessage, runAllActions, setOxygenLevel, testGame, churn, fakeCard} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('SpeciesPropagation', () => {
  let card: SpeciesPropagation;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    [game, player, player2] = testGame(2);
    card = new SpeciesPropagation();
  });

  it('has the expected card properties', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.name).to.eq(CardName.SPECIES_PROPAGATION);
    expect(card.cost).to.eq(11);
    expect(card.tags).to.deep.eq([Tag.ANIMAL]);
    expect(card.resourceType).to.eq(CardResource.ANIMAL);
    expect(card.victoryPoints).to.deep.eq({resourcesHere: {}});
    expect(card.requirements).to.deep.eq([{oxygen: 10, count: 10}]);
    expect(card.metadata.cardNumber).to.eq('XB84');
  });

  it('requires 10% oxygen', () => {
    player.megaCredits = card.cost;
    setOxygenLevel(game, 9);
    expect(card.canPlay(player)).to.be.false;

    setOxygenLevel(game, 10);
    expect(card.canPlay(player)).to.be.true;
  });

  it('offers an optional payment for animal and plant tags, including dual tags', () => {
    player.playedCards.push(card);
    player.megaCredits = 3;
    game.gameLog.length = 0;

    const input = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.ANIMAL, Tag.PLANT]}), player), player), OrOptions);
    expect(input.options).to.have.length(2);
    expect(cast(input.options[0], SelectOption).title).to.eq('支付3 M€，在此卡上增加1个动物资源');
    expect(cast(input.options[1], SelectOption).title).to.eq('跳过物种繁衍效果');

    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    const resourceLogs = game.gameLog.filter((entry) => formatMessage(entry).includes(`from ${CardName.SPECIES_PROPAGATION}`));
    expect(resourceLogs).to.have.length(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 3 M€ because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(1);
  });

  it('triggers for its own play', () => {
    setOxygenLevel(game, 8);
    player.cardsInHand = [card];
    player.megaCredits = card.cost + 3;
    player.playCard(card, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const input = cast(player.popWaitingFor(), OrOptions);
    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
    expect(player.megaCredits).to.eq(0);
    expect(player.game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 3 M€ because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(1);
  });

  it('triggers for another player and can be skipped', () => {
    player.playedCards.push(card);
    player.megaCredits = 3;

    const input = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.PLANT]}), player2), player2), OrOptions);
    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
    expect(player.megaCredits).to.eq(0);

    player.megaCredits = 3;
    const skipInput = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.ANIMAL]}), player2), player2), OrOptions);
    cast(skipInput.options[1], SelectOption).cb(undefined);
    runAllActions(game);

    expect(card.resourceCount).to.eq(1);
    expect(player.megaCredits).to.eq(3);
  });

  it('supports Helion heat payment after choosing to add an animal', () => {
    player.playedCards.push(card);
    player.canUseHeatAsMegaCredits = true;
    player.heat = 3;
    game.gameLog.length = 0;

    const input = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.ANIMAL]}), player), player), OrOptions);
    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    payment.cb(Payment.of({heat: 3}));

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    const resourceLogs = game.gameLog.filter((entry) => formatMessage(entry).includes(`from ${CardName.SPECIES_PROPAGATION}`));
    expect(resourceLogs).to.have.length(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 3 heat because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(1);
  });

  it('waits for Stormcraft heat payment before logging or adding an animal', () => {
    const helion = new Helion();
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(helion);
    player.playCorporationCard(stormcraft);
    runAllActions(game);
    player.playedCards.push(card);
    player.megaCredits = 0;
    player.heat = 0;
    stormcraft.resourceCount = 2;

    const input = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.ANIMAL]}), player), player), OrOptions);
    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    const heatPayment = cast(payment.cb(Payment.of({heat: 3})), AndOptions);
    expect(card.resourceCount).to.eq(0);
    expect(stormcraft.resourceCount).to.eq(2);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`because of ${CardName.SPECIES_PROPAGATION}`))).to.have.length(0);

    cast(heatPayment.options[0], SelectAmount).cb(0);
    cast(heatPayment.options[1], SelectAmount).cb(2);
    heatPayment.cb(undefined);

    expect(player.heat).to.eq(0);
    expect(stormcraft.resourceCount).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 3 heat because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(0);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === "blue removed 2 resource(s) from blue's Stormcraft Incorporated")).to.have.length(1);
  });

  it('logs only the actual heat and floater cost for a mixed Stormcraft payment', () => {
    const helion = new Helion();
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(helion);
    player.playCorporationCard(stormcraft);
    runAllActions(game);
    player.playedCards.push(card);
    player.megaCredits = 0;
    player.heat = 1;
    stormcraft.resourceCount = 1;

    const input = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.ANIMAL]}), player), player), OrOptions);
    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    const heatPayment = cast(payment.cb(Payment.of({heat: 3})), AndOptions);
    expect(card.resourceCount).to.eq(0);
    expect(player.heat).to.eq(1);
    expect(stormcraft.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`because of ${CardName.SPECIES_PROPAGATION}`))).to.have.length(0);

    cast(heatPayment.options[0], SelectAmount).cb(1);
    cast(heatPayment.options[1], SelectAmount).cb(1);
    heatPayment.cb(undefined);

    expect(player.heat).to.eq(0);
    expect(stormcraft.resourceCount).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 1 heat because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === "blue removed 1 resource(s) from blue's Stormcraft Incorporated")).to.have.length(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 3 heat because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(0);
  });

  it('logs Luna Trade Federation titanium payment', () => {
    const lunaTradeFederation = new LunaTradeFederation();
    player.playCorporationCard(lunaTradeFederation);
    runAllActions(game);
    player.playedCards.push(card);
    player.megaCredits = 0;
    player.titanium = 2;

    const input = cast(churn(() => card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.ANIMAL]}), player), player), OrOptions);
    cast(input.options[0], SelectOption).cb(undefined);
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    payment.cb(Payment.of({titanium: 2}));
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === `blue lost 2 titanium because of ${CardName.SPECIES_PROPAGATION}`)).to.have.length(1);
  });

  it('does not trigger for an unrelated tag or when payment is unavailable', () => {
    player.playedCards.push(card);

    expect(card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.SPACE]}), player)).to.be.undefined;

    player.megaCredits = 2;
    expect(card.onCardPlayedByAnyPlayer(player, fakeCard({tags: [Tag.PLANT]}), player)).to.be.undefined;
    expect(card.resourceCount).to.eq(0);
  });
});
