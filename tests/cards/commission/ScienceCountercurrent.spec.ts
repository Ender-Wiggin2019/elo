import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {CardName} from '../../../src/common/cards/CardName';
import {Payment} from '../../../src/common/inputs/Payment';
import {Phase} from '../../../src/common/Phase';
import {Tag} from '../../../src/common/cards/Tag';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Mine} from '../../../src/server/cards/base/Mine';
import {Research} from '../../../src/server/cards/base/Research';
import {ScienceCountercurrent} from '../../../src/server/cards/commission/ScienceCountercurrent';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {cast} from '../../../src/common/utils/utils';
import {formatMessage, runAllActions, setRulingParty, testGame} from '../../TestingUtils';

describe('ScienceCountercurrent', () => {
  it('has the expected card properties', () => {
    const card = new ScienceCountercurrent();

    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.name).to.eq(CardName.SCIENCE_COUNTERCURRENT);
    expect(card.cost).to.eq(15);
    expect(card.tags).to.deep.eq([Tag.SCIENCE]);
    expect(card.resourceType).to.eq(CardResource.SCIENCE);
    expect(card.victoryPoints).to.eq(1);
    expect(card.requirements).to.have.length(1);
    expect(card.requirements[0]).to.have.property('party', PartyName.REDS);
    expect(card.metadata.cardNumber).to.eq('XB87');
  });

  it('requires Reds to be ruling or supported', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(1, {turmoilExtension: true});
    player.megaCredits = card.cost;

    setRulingParty(game, PartyName.MARS);
    expect(card.canPlay(player)).to.be.false;

    setRulingParty(game, PartyName.REDS);
    expect(card.canPlay(player)).to.be.true;

    const [delegateGame, delegatePlayer] = testGame(1, {turmoilExtension: true});
    delegatePlayer.megaCredits = card.cost;
    delegateGame.turmoil!.getPartyByName(PartyName.REDS).delegates.add(delegatePlayer, 2);
    expect(card.canPlay(delegatePlayer)).to.be.true;
  });

  it('offers one choice for a multi-step actual TR increase and logs the source once', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.MARS);
    player.playedCards.push(card);
    player.production.override({megacredits: 0});
    game.gameLog.length = 0;

    const before = player.terraformRating;
    player.increaseTerraformRating(3);
    expect(player.terraformRating).to.eq(before + 3);

    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.options).to.have.length(2);
    expect(options.options[0].title).to.eq('降低 1 级 M€ 产量，在本卡增加 1 个科学资源');
    expect(options.options[1].title).to.eq('跳过');
    options.options[0].cb();

    expect(player.production.megacredits).to.eq(-1);
    expect(card.resourceCount).to.eq(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`because of ${card.name}`))).to.have.length(1);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`added 1 Science to ${card.name} from ${card.name}`))).to.have.length(1);
  });

  it('can skip the production decrease without changing resources or logging a source effect', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.MARS);
    player.playedCards.push(card);
    player.production.override({megacredits: 0});
    game.gameLog.length = 0;

    player.increaseTerraformRating();
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb();

    expect(player.production.megacredits).to.eq(0);
    expect(card.resourceCount).to.eq(0);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(card.name))).to.be.empty;
  });

  it('only triggers for its owner', () => {
    const card = new ScienceCountercurrent();
    const [game, player, opponent] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.MARS);
    player.playedCards.push(card);
    player.production.override({megacredits: 0});

    opponent.increaseTerraformRating();
    runAllActions(game);

    expect(player.getWaitingFor()).to.be.undefined;
    expect(player.production.megacredits).to.eq(0);
    expect(card.resourceCount).to.eq(0);
  });

  it('does not offer the effect at the minimum M€ production', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.MARS);
    player.playedCards.push(card);
    player.production.override({megacredits: -5});

    const before = player.terraformRating;
    player.increaseTerraformRating();
    runAllActions(game);

    expect(player.terraformRating).to.eq(before + 1);
    expect(player.getWaitingFor()).to.be.undefined;
    expect(player.production.megacredits).to.eq(-5);
    expect(card.resourceCount).to.eq(0);
  });

  it('does not trigger when Preservation Program blocks the actual increase', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.MARS);
    player.playedCards.push(card);
    player.production.override({megacredits: 0});
    game.phase = Phase.ACTION;
    player.preservationProgram = true;

    const before = player.terraformRating;
    player.increaseTerraformRating();
    runAllActions(game);

    expect(player.terraformRating).to.eq(before);
    expect(player.getWaitingFor()).to.be.undefined;
    expect(player.production.megacredits).to.eq(0);
    expect(card.resourceCount).to.eq(0);
  });

  it('waits for and then triggers after the Reds surcharge is paid', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    player.playedCards.push(card);
    player.megaCredits = 3;
    player.canUseHeatAsMegaCredits = true;
    player.heat = 1;
    player.production.override({megacredits: 0});

    const before = player.terraformRating;
    player.increaseTerraformRating();
    expect(player.terraformRating).to.eq(before);
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    payment.cb(Payment.of({megacredits: 3}));
    expect(player.terraformRating).to.eq(before + 1);
    expect(card.resourceCount).to.eq(0);

    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb();

    expect(player.megaCredits).to.eq(0);
    expect(player.production.megacredits).to.eq(-1);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not trigger when the Reds surcharge cannot be paid', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    player.playedCards.push(card);
    player.megaCredits = 2;
    player.production.override({megacredits: 0});

    const before = player.terraformRating;
    player.increaseTerraformRating();
    runAllActions(game);

    expect(player.terraformRating).to.eq(before);
    expect(player.getWaitingFor()).to.be.undefined;
    expect(player.production.megacredits).to.eq(0);
    expect(card.resourceCount).to.eq(0);
  });

  it('spends one Science and keeps one of three drawn cards', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    player.playedCards.push(card);
    card.resourceCount = 1;
    const first = new Research();
    const second = new Mine();
    const third = new Mine();
    game.projectDeck.drawPile = [first, second, third];
    game.projectDeck.discardPile = [];
    game.gameLog.length = 0;

    expect(card.canAct(player)).to.be.true;
    expect(card.action(player)).to.be.undefined;
    expect(card.resourceCount).to.eq(0);
    expect(game.gameLog.filter((entry) => formatMessage(entry).includes(`removed 1 resource(s) from blue's ${card.name}`))).to.have.length(1);

    runAllActions(game);
    const selection = cast(player.popWaitingFor(), SelectCard);
    expect(selection.cards).to.have.length(3);
    selection.cb([selection.cards[0]]);

    expect(player.cardsInHand).to.have.length(1);
    expect(game.projectDeck.discardPile).to.have.length(2);
  });

  it('can draw and keep the only remaining project card', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    player.playedCards.push(card);
    card.resourceCount = 1;
    const onlyCard = new Research();
    game.projectDeck.drawPile = [onlyCard];
    game.projectDeck.discardPile = [];

    expect(card.canAct(player)).to.be.true;
    card.action(player);
    runAllActions(game);

    const selection = cast(player.popWaitingFor(), SelectCard);
    expect(selection.cards).to.deep.eq([onlyCard]);
    selection.cb([onlyCard]);
    expect(player.cardsInHand).to.deep.eq([onlyCard]);
    expect(game.projectDeck.discardPile).to.be.empty;
  });

  it('cannot act without a resource or a card to draw', () => {
    const card = new ScienceCountercurrent();
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    player.playedCards.push(card);

    expect(card.canAct(player)).to.be.false;
    card.resourceCount = 1;
    game.projectDeck.drawPile.length = 0;
    game.projectDeck.discardPile.length = 0;
    expect(card.canAct(player)).to.be.false;
  });
});
