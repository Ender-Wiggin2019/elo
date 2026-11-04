import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {AntarcticLanternfish} from '../../../src/server/cards/commission/AntarcticLanternfish';
import {PlaceOceanTile} from '../../../src/server/deferredActions/PlaceOceanTile';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {formatMessage, maxOutOceans, runAllActions, testGame} from '../../TestingUtils';

describe('AntarcticLanternfish', () => {
  let card: AntarcticLanternfish;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new AntarcticLanternfish();
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('has the expected active properties', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.cost).to.eq(11);
    expect(card.tags).to.deep.eq([Tag.ANIMAL, Tag.POWER]);
    expect(card.requirements).to.deep.eq([{oceans: 2, count: 2}]);
    expect(card.metadata.cardNumber).to.eq('XB91');
  });

  it('gains one energy on play instead of placing an ocean', () => {
    game.addOcean(player, game.board.getAvailableSpacesForOcean(player)[0]);
    game.addOcean(player, game.board.getAvailableSpacesForOcean(player)[0]);
    const oceansBefore = game.board.getOceanSpaces().length;

    player.playCard(card);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).to.have.length(oceansBefore);
    expect(player.energy).to.eq(1);
    expect(player.production.energy).to.eq(0);
  });

  it('gains one energy for every actual ocean placement', () => {
    player.playedCards.push(card);

    game.addOcean(otherPlayer, game.board.getAvailableSpacesForOcean(otherPlayer)[0]);
    runAllActions(game);
    game.addOcean(otherPlayer, game.board.getAvailableSpacesForOcean(otherPlayer)[0]);
    runAllActions(game);

    expect(player.energy).to.eq(2);
    expect(game.gameLog.map(formatMessage).filter((entry) =>
      entry === 'blue gained 1 energy because of 🌸电灯鱼🌸')).to.have.length(2);
  });

  it('does not gain passive energy for an ocean placement attempt at the cap', () => {
    maxOutOceans(player);
    player.playedCards.push(card);

    game.defer(new PlaceOceanTile(otherPlayer));
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(game.gameLog.map(formatMessage).filter((entry) =>
      entry === 'blue gained 1 energy because of 🌸电灯鱼🌸')).to.be.empty;
  });
});
