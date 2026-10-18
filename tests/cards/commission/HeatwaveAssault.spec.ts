import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Units} from '../../../src/common/Units';
import {HeatwaveAssault} from '../../../src/server/cards/commission/HeatwaveAssault';
import {IGame} from '../../../src/server/IGame';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Payment} from '../../../src/common/inputs/Payment';
import {MAX_TEMPERATURE} from '../../../src/common/constants';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard, formatMessage, maxOutOceans, runAllActions, setRulingParty, setTemperature, testGame, testRedsCosts} from '../../TestingUtils';

function trGainLogs(game: IGame): Array<string> {
  return game.gameLog
    .filter((entry) => entry.message === '${0} gained ${1} TR' || entry.message === '${0} gained ${1} TR from ${2}')
    .map(formatMessage);
}

describe('HeatwaveAssault', () => {
  let card: HeatwaveAssault;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new HeatwaveAssault();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    maxOutOceans(player, 6);
    player.steel = 2;
    game.gameLog.length = 0;
  });

  it('has the commissioned card properties', () => {
    expect(card.type).to.eq(CardType.AUTOMATED);
    expect(card.cost).to.eq(11);
    expect(card.tags).to.deep.eq([Tag.SPACE]);
    expect(card.victoryPoints).to.eq(-1);
    expect(card.requirements).to.deep.eq([{oceans: 6, count: 6}]);
    expect(card.metadata.cardNumber).to.eq('XB80');
  });

  it('requires six oceans and two steel in addition to its card cost', () => {
    const [requirementsGame, requirementsPlayer] = testGame(1, {skipInitialShuffling: true});
    requirementsPlayer.megaCredits = card.cost;

    expect(requirementsPlayer.canPlay(card)).to.be.false;

    maxOutOceans(requirementsPlayer, 6);
    requirementsPlayer.steel = 0;
    expect(requirementsPlayer.canPlay(card)).to.be.false;

    requirementsPlayer.steel = 2;
    expect(requirementsPlayer.canPlay(card)).to.be.true;
    expect(requirementsGame.getTemperature()).to.eq(-30);
  });

  it('raises temperature and removes two steel as an ordinary resource loss', () => {
    player.megaCredits = card.cost;
    player.cardsInHand = [card];
    expect(player.canPlay(card)).to.be.true;

    game.gameLog.length = 0;
    const oldTemperature = game.getTemperature();
    const before = player.terraformRating;
    player.checkPaymentAndPlayCard(card, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    expect(player.playedCards.has(card.name)).to.be.true;
    expect(player.steel).to.eq(0);
    expect(game.getTemperature()).to.eq(oldTemperature + 4);
    expect(player.terraformRating).to.eq(before + 2);
    expect(trGainLogs(game)).to.deep.eq(['blue gained 2 TR']);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 2 steel because of 🌸热浪侵袭🌸')).to.have.length(1);
  });

  it('logs only one TR when one temperature step remains', () => {
    setTemperature(game, MAX_TEMPERATURE - 2);
    player.megaCredits = card.cost;
    player.cardsInHand = [card];
    const before = player.terraformRating;

    expect(player.canPlay(card)).to.be.true;
    player.checkPaymentAndPlayCard(card, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    expect(game.getTemperature()).to.eq(MAX_TEMPERATURE);
    expect(player.terraformRating).to.eq(before + 1);
    expect(trGainLogs(game)).to.deep.eq(['blue gained 1 TR']);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 2 steel because of 🌸热浪侵袭🌸')).to.have.length(1);
  });

  it('charges Reds for two temperature steps', () => {
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
    maxOutOceans(player, 6);
    player.steel = 2;
    setRulingParty(game, PartyName.REDS);

    testRedsCosts(() => player.canPlay(card), player, card.cost, 6);
    expect(card.additionalProjectCosts).to.deep.eq({redsCost: 6});
  });

  it('still removes steel when temperature is already capped', () => {
    setTemperature(game, MAX_TEMPERATURE);
    player.megaCredits = card.cost;

    player.playCard(card);
    runAllActions(game);

    expect(player.steel).to.eq(0);
    expect(game.getTemperature()).to.eq(MAX_TEMPERATURE);
    expect(trGainLogs(game)).to.be.empty;
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 2 steel because of 🌸热浪侵袭🌸')).to.have.length(1);
  });

  it('logs the actual two TR after the Reds surcharge is paid', () => {
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
    maxOutOceans(player, 6);
    player.steel = 2;
    player.megaCredits = card.cost + 6;
    player.cardsInHand = [card];
    setRulingParty(game, PartyName.REDS);

    expect(player.canPlay(card)).to.be.true;
    game.gameLog.length = 0;
    const before = player.terraformRating;
    player.checkPaymentAndPlayCard(card, Payment.of({megacredits: card.cost}));

    expect(player.terraformRating).to.eq(before);
    expect(trGainLogs(game)).to.be.empty;
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.terraformRating).to.eq(before + 2);
    expect(trGainLogs(game)).to.deep.eq(['blue gained 2 TR']);
    expect(game.gameLog.filter((entry) => formatMessage(entry) === 'blue lost 2 steel because of 🌸热浪侵袭🌸')).to.have.length(1);
  });

  it('does not report the steel loss as a metal payment', () => {
    const spent: Array<Readonly<Units>> = [];
    player.playedCards.push(fakeCard({
      onResourcesSpent: (_player, units) => spent.push(units),
    }));

    card.play(player);
    runAllActions(game);

    expect(spent).to.be.empty;
  });
});
