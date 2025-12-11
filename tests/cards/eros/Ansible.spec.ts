import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Ansible} from '../../../src/server/cards/eros/Ansible';
import {IGame} from '../../../src/server/IGame';
import {Tag} from '../../../src/common/cards/Tag';
import {fakeCard} from '../../TestingUtils';

describe('Ansible', function() {
  let card: Ansible;
  let player: TestPlayer;
  let other: TestPlayer;
  let game: IGame;

  beforeEach(function() {
    card = new Ansible();
    [game, player, other] = testGame(2, {skipInitialShuffling: true});
  });

  function addScienceTags() {
    // 交替打出6张真实科学标签卡牌
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE]}));
  }

  it('canPlay 需要6个科学标签', function() {
    expect(card.canPlay(player)).to.be.false;
    addScienceTags();
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 能正常加入打出卡区', function() {
    addScienceTags();
    player.playCard(card);
    expect(player.playedCards.get(card.name)).to.deep.equal(card);
  });

  it('action 自己抽3张牌，对手各抽1张牌', function() {
    addScienceTags();
    player.playCard(card);
    const handBefore = player.cardsInHand.length;
    const otherHandBefore = other.cardsInHand.length;
    card.action(player);
    // 处理deferred actions
    while (game.deferredActions.length > 0) {
      game.deferredActions.pop()?.execute();
    }
    expect(player.cardsInHand.length).to.equal(handBefore + 3);
    expect(other.cardsInHand.length).to.equal(otherHandBefore + 1);
  });
});
