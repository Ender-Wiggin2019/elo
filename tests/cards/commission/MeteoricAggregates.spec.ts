import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {CardResource} from '../../../src/common/CardResource';
import {Payment, isPayment} from '../../../src/common/inputs/Payment';
import {MeteoricAggregates} from '../../../src/server/cards/commission/MeteoricAggregates';
import {ScienceCountercurrent} from '../../../src/server/cards/commission/ScienceCountercurrent';
import {isProductionProject} from '../../../src/server/cards/ProductionProject';
import {Mine} from '../../../src/server/cards/base/Mine';
import {ArtificialPhotosynthesis} from '../../../src/server/cards/base/ArtificialPhotosynthesis';
import {RoboticWorkforce} from '../../../src/server/cards/base/RoboticWorkforce';
import {PowerInfrastructure} from '../../../src/server/cards/base/PowerInfrastructure';
import {PowerPlantStandardProject} from '../../../src/server/cards/base/standardProjects/PowerPlantStandardProject';
import {KuiperCooperative} from '../../../src/server/cards/promo/KuiperCooperative';
import {PrivateSecurity} from '../../../src/server/cards/pathfinders/PrivateSecurity';
import {deserializeCorporationCard, serializeCorporationCard} from '../../../src/server/cards/CardSerialization';
import {SelectProjectCardToPlay} from '../../../src/server/inputs/SelectProjectCardToPlay';
import {SelectStandardProjectToPlay} from '../../../src/server/inputs/SelectStandardProjectToPlay';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast, fakeCard, formatMessage, runAllActions, testGame} from '../../TestingUtils';

describe('MeteoricAggregates', () => {
  it('has the expected corporation properties and logs both starting metals', () => {
    const [game, player] = testGame(1);
    const card = new MeteoricAggregates();
    expect(card.type).eq(CardType.CORPORATION);
    expect(card.tags).deep.eq([Tag.EARTH, Tag.SPACE]);
    expect(card.startingMegaCredits).eq(42);
    expect(card.resourceType).eq(CardResource.ASTEROID);
    expect(card.metadata.cardNumber).eq('XB85');
    expect(card.canAct()).is.true;

    card.play(player);
    runAllActions(game);
    expect(player.steel).eq(1);
    expect(player.titanium).eq(1);
    const logs = game.gameLog.map(formatMessage);
    for (const resource of ['steel', 'titanium']) {
      expect(logs.filter((message) => message.includes(`gained 1 ${resource}`) && message.includes(card.name))).has.length(1);
    }
  });

  it('adds two asteroids here with one source log', () => {
    const [game, player] = testGame(1);
    const card = new MeteoricAggregates();
    player.playedCards.push(card);
    cast(card.action(player), OrOptions).options[0].cb();
    expect(card.resourceCount).eq(2);
    expect(game.gameLog.map(formatMessage).filter((message) =>
      message.includes('added 2 Asteroid') && message.includes(card.name))).has.length(1);
  });

  it('can add one asteroid to an own card without offering opponents cards', () => {
    const [game, player, other] = testGame(2);
    const card = new MeteoricAggregates();
    const target = new KuiperCooperative();
    const opponentsCard = fakeCard({resourceType: CardResource.ASTEROID});
    player.playedCards.push(card, target);
    other.playedCards.push(opponentsCard);

    const choice = cast(card.action(player), OrOptions);
    const select = cast(choice.options[1], SelectCard);
    expect(select.cards).deep.eq([card, target]);
    select.cb([target]);
    expect(card.resourceCount).eq(0);
    expect(target.resourceCount).eq(1);
    expect(opponentsCard.resourceCount).eq(0);
    expect(game.gameLog.map(formatMessage).filter((message) =>
      message.includes('added 1 Asteroid') && message.includes(card.name) && message.includes(target.name))).has.length(1);
  });

  it('recognizes printed production across project types and excludes ordinary resource gains', () => {
    for (const card of [new Mine(), new ArtificialPhotosynthesis(), new RoboticWorkforce(), new ScienceCountercurrent()]) {
      expect(isProductionProject(card), card.name).is.true;
    }
    expect(isProductionProject(fakeCard({type: CardType.EVENT, behavior: {production: {plants: 1}}}))).is.true;
    expect(isProductionProject(new PowerInfrastructure())).is.false;
    expect(isProductionProject(new PrivateSecurity())).is.false;
    expect(isProductionProject(new PowerPlantStandardProject())).is.false;
    expect(isProductionProject(new MeteoricAggregates())).is.false;
    expect(isProductionProject(fakeCard({type: CardType.AUTOMATED, behavior: {stock: {steel: 2}}}))).is.false;
  });

  it('spends only the selected asteroids at 3 M€ and logs their removal once', () => {
    const [game, player] = testGame(1);
    const card = new MeteoricAggregates();
    const project = new Mine();
    player.playedCards.push(card);
    card.resourceCount = 3;
    player.megaCredits = 1;
    player.cardsInHand = [project];
    expect(player.canPlay(project)).is.true;
    expect(player.payingAmount(Payment.of({meteoricAsteroids: 1}), player.affordOptionsForCard(project))).eq(3);

    player.checkPaymentAndPlayCard(project, Payment.of({megacredits: 1, meteoricAsteroids: 1}));
    runAllActions(game);
    expect(card.resourceCount).eq(2);
    expect(player.megaCredits).eq(0);
    expect(player.production.steel).eq(1);
    expect(game.gameLog.map(formatMessage).filter((message) =>
      message.includes('removed 1 resource(s)') && message.includes(card.name))).has.length(1);
  });

  it('can cover the cost remainder by spending two asteroids on a 4 M€ project', () => {
    const [game, player] = testGame(1);
    const card = new MeteoricAggregates();
    const project = new Mine();
    player.playedCards.push(card);
    card.resourceCount = 2;
    player.megaCredits = 0;
    player.cardsInHand = [project];
    expect(player.canPlay(project)).is.true;
    player.checkPaymentAndPlayCard(project, Payment.of({meteoricAsteroids: 2}));
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(player.production.steel).eq(1);
  });

  it('rejects excess resources and underpayment without changing the corporation', () => {
    const [, player] = testGame(1);
    const card = new MeteoricAggregates();
    player.playedCards.push(card);
    card.resourceCount = 1;
    player.megaCredits = 0;
    expect(() => player.checkPaymentAndPlayCard(new Mine(), Payment.of({meteoricAsteroids: 2}))).to.throw('that many resources');
    expect(() => player.checkPaymentAndPlayCard(new Mine(), Payment.of({meteoricAsteroids: 1}))).to.throw('Did not spend enough');
    expect(card.resourceCount).eq(1);
  });

  it('rejects asteroids on nonproduction cards even with enough ordinary money', () => {
    const [, player] = testGame(1);
    const card = new MeteoricAggregates();
    player.playedCards.push(card);
    card.resourceCount = 2;
    player.megaCredits = 10;
    expect(player.affordOptionsForCard(new PowerInfrastructure()).meteoricAsteroids).is.false;
    expect(() => player.checkPaymentAndPlayCard(new PowerInfrastructure(), Payment.of({megacredits: 4, meteoricAsteroids: 1}))).to.throw('project card with production');
    expect(card.resourceCount).eq(2);
    expect(player.megaCredits).eq(10);
  });

  it('does not use another asteroid card as Meteoric Aggregates currency', () => {
    const [, player] = testGame(1);
    const other = new KuiperCooperative();
    player.playedCards.push(other);
    other.resourceCount = 10;
    player.megaCredits = 0;
    expect(player.affordOptionsForCard(new Mine()).meteoricAsteroids).is.false;
    expect(player.getSpendable('meteoricAsteroids')).eq(0);
    expect(player.canPlay(new Mine())).is.false;
    expect(() => player.checkPaymentAndPlayCard(new Mine(), Payment.of({meteoricAsteroids: 2}))).to.throw('that many resources');
  });

  it('models the available asteroids and per-card eligibility for both payment interfaces', () => {
    const [, player] = testGame(1);
    const card = new MeteoricAggregates();
    const projects = [new Mine(), new PowerInfrastructure()];
    player.playedCards.push(card);
    card.resourceCount = 2;
    const model = new SelectProjectCardToPlay(player, projects).toModel(player);
    expect(model.meteoricAsteroids).eq(2);
    expect(model.cards[0].canPayWithMeteoricAsteroids).is.true;
    expect(model.cards[1].canPayWithMeteoricAsteroids).is.undefined;

    const standardModel = new SelectStandardProjectToPlay(player, [new PowerPlantStandardProject()]).toModel(player);
    expect(standardModel.cards[0].canPayWithMeteoricAsteroids).is.undefined;
  });

  it('rejects asteroid payments for standard projects and unrelated costs', () => {
    const [, player] = testGame(1);
    const card = new MeteoricAggregates();
    player.playedCards.push(card);
    card.resourceCount = 10;
    player.megaCredits = 100;
    const project = new PowerPlantStandardProject();
    const input = new SelectStandardProjectToPlay(player, [project]);
    expect(() => input.process({
      type: 'projectCard', card: project.name, payment: Payment.of({megacredits: 11, meteoricAsteroids: 1}),
    })).to.throw('standard projects');
    expect(() => new SelectPayment('Pay', 3, {}).process({
      type: 'payment', payment: Payment.of({megacredits: 3, meteoricAsteroids: 1}),
    }, player)).to.throw('cannot pay this cost');
    expect(card.resourceCount).eq(10);
    expect(player.megaCredits).eq(100);
  });

  it('serializes its resources and includes the new currency in complete payments', () => {
    const card = new MeteoricAggregates();
    card.resourceCount = 7;
    const restored = deserializeCorporationCard(serializeCorporationCard(card));
    expect(restored.name).eq(card.name);
    expect(restored.resourceCount).eq(7);
    expect(Payment.of({}).meteoricAsteroids).eq(0);
    expect(isPayment(Payment.of({meteoricAsteroids: 1}))).is.true;
  });
});
