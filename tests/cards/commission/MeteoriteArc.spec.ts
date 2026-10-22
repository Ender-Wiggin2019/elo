import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {MeteoriteArc} from '../../../src/server/cards/commission/MeteoriteArc';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {cast, formatMessage, maxOutOceans, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('MeteoriteArc', () => {
  let card: MeteoriteArc;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new MeteoriteArc();
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
  });

  function energyLogs(): Array<string> {
    return game.gameLog.map(formatMessage).filter((entry) =>
      entry === 'blue gained 1 energy because of 🌸陨星电弧🌸');
  }

  it('has the expected active cost, tags, and ocean requirement', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.cost).to.eq(19);
    expect(card.tags).to.deep.eq([Tag.SPACE, Tag.POWER]);
    expect(card.metadata.cardNumber).to.eq('XB89');
    expect(card.canPlay(player)).to.be.false;

    game.addOcean(player, game.board.getAvailableSpacesForOcean(player)[0]);
    expect(card.canPlay(player)).to.be.false;
    game.addOcean(player, game.board.getAvailableSpacesForOcean(player)[0]);
    expect(card.canPlay(player)).to.be.true;
  });

  it('places an ocean when played and gains one energy resource for that ocean', () => {
    const startingOceans = game.board.getOceanSpaces().length;
    const startingTR = player.getTerraformRating();

    player.playCard(card);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).to.have.length(startingOceans + 1);
    expect(player.energy).to.eq(1);
    expect(player.production.energy).to.eq(0);
    expect(player.getTerraformRating()).to.eq(startingTR + 1);
    expect(energyLogs()).to.have.length(1);
  });

  it('gains energy when another player places an ocean and logs once per ocean', () => {
    player.playedCards.push(card);
    const firstOcean = game.board.getAvailableSpacesForOcean(otherPlayer)[0];
    game.addOcean(otherPlayer, firstOcean);
    runAllActions(game);

    expect(player.energy).to.eq(1);
    expect(player.production.energy).to.eq(0);
    expect(energyLogs()).to.have.length(1);

    const secondOcean = game.board.getAvailableSpacesForOcean(otherPlayer)[0];
    game.addOcean(otherPlayer, secondOcean);
    runAllActions(game);

    expect(player.energy).to.eq(2);
    expect(energyLogs()).to.have.length(2);
  });

  it('does not gain energy when an ocean placement is attempted at the ocean cap', () => {
    maxOutOceans(player);
    player.playCard(card);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(player.production.energy).to.eq(0);
    expect(energyLogs()).is.empty;
  });
});
