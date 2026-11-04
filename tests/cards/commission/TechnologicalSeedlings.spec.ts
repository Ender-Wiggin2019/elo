import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {TechnologicalSeedlings} from '../../../src/server/cards/commission/TechnologicalSeedlings';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard, formatMessage, setOxygenLevel} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('TechnologicalSeedlings', () => {
  let card: TechnologicalSeedlings;
  let game: IGame;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;

  beforeEach(() => {
    card = new TechnologicalSeedlings();
    [game, player, otherPlayer] = testGame(2, {skipInitialShuffling: true});
  });

  function plantLogs(): Array<string> {
    return game.gameLog.map(formatMessage).filter((entry) =>
      entry === 'blue gained 1 plant because of 🌸科技育苗🌸' ||
      entry === 'blue gained 2 plants because of 🌸科技育苗🌸' ||
      entry === 'blue gained 3 plants because of 🌸科技育苗🌸');
  }

  it('is an automated science and plant card that costs 15 M€ and requires oxygen at most 8%', () => {
    expect(card.type).to.eq(CardType.AUTOMATED);
    expect(card.cost).to.eq(15);
    expect(card.tags).to.deep.eq([Tag.SCIENCE, Tag.PLANT]);
    expect(card.requirements).to.deep.eq([{oxygen: 8, count: 8, max: true}]);
    expect(card.metadata.cardNumber).to.eq('XB90');
  });

  it('cannot be played above 8% oxygen', () => {
    player.megaCredits = card.cost;
    setOxygenLevel(game, 9);
    expect(card.canPlay(player)).to.be.false;

    setOxygenLevel(game, 8);
    expect(card.canPlay(player)).to.be.true;
  });

  it('gains plants for its own science tag when played', () => {
    player.playCard(card);

    expect(player.plants).to.eq(1);
    expect(player.production.plants).to.eq(0);
    expect(plantLogs()).to.have.length(1);
  });

  it('counts only its owner science tags and includes this card once', () => {
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE]}));
    otherPlayer.playedCards.push(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE]}));

    player.playCard(card);

    expect(player.plants).to.eq(3);
    expect(player.production.plants).to.eq(0);
    expect(plantLogs()).to.deep.eq(['blue gained 3 plants because of 🌸科技育苗🌸']);
  });
});
