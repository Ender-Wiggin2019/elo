import {expect} from 'chai';
import {Cow} from '../../../src/server/cards/eros/Cow';
import {CardName} from '../../../src/common/cards/CardName';
import {setOxygenLevel} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';

describe('Cow', () => {
  let card: Cow;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Cow();
    [game, player] = testGame(1, {skipInitialShuffling: true});
  });

  it('should not be playable if oxygen < 5%', () => {
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).to.be.false;
  });

  it('should be playable if oxygen >= 5%', () => {
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).to.be.true;
    setOxygenLevel(game, 8);
    expect(card.canPlay(player)).to.be.true;
  });

  it('should play and have 0 animal resource initially', () => {
    setOxygenLevel(game, 5);
    player.playCard(card);
    expect(card.resourceCount).to.eq(0);
  });

  it('should not be able to act if no plants', () => {
    setOxygenLevel(game, 5);
    player.playCard(card);
    expect(card.canAct(player)).to.be.false;
  });

  it('should gain 1 animal by spending 1 plant', () => {
    setOxygenLevel(game, 5);
    player.playCard(card);
    player.plants = 1;
    card.action!(player);
    expect(player.plants).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('should accumulate animals and score points', () => {
    setOxygenLevel(game, 5);
    player.playCard(card);
    player.plants = 3;
    card.action!(player); // 1
    player.plants = 2;
    card.action!(player); // 2
    player.plants = 1;
    card.action!(player); // 3
    expect(card.resourceCount).to.eq(3);
    // Cow 每2动物=1分
    expect(card.getVictoryPoints(player)).to.eq(1);
    card.resourceCount = 4;
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('should persist after serialization/deserialization', () => {
    setOxygenLevel(game, 5);
    player.playCard(card);
    player.plants = 2;
    card.action!(player);
    card.action!(player);
    expect(card.resourceCount).to.eq(2);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(CardName.COW);
    expect(card2!.resourceCount).to.eq(2);
    expect(card2!.getVictoryPoints(player2)).to.eq(1);
  });
});
