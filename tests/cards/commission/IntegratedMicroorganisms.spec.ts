import {expect} from 'chai';
import {IntegratedMicroorganisms} from '../../../src/server/cards/commission/IntegratedMicroorganisms';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Worms} from '../../../src/server/cards/base/Worms';
import {Mine} from '../../../src/server/cards/base/Mine';
import {Tag} from '../../../src/common/cards/Tag';
import {Psychrophiles} from '../../../src/server/cards/prelude/Psychrophiles';

describe('IntegratedMicroorganisms', () => {
  let card: IntegratedMicroorganisms;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new IntegratedMicroorganisms();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
    game.projectDeck.drawPile.push(new Psychrophiles(), new Mine());
  });

  it('should start with 47 M€ and draw one microbe card plus its own tag reward', () => {
    const microbeCard = new Ants();
    game.projectDeck.drawPile.push(microbeCard, new Mine());
    player.playCorporationCard(card);
    expect(player.cardsInHand.length).to.eq(2);
    runAllActions(game);
    expect(card.startingMegaCredits).to.equal(47);
    expect(player.cardsInHand.length).to.eq(2);
    expect(player.cardsInHand.filter((drawn) => drawn.tags.includes(Tag.MICROBE))).to.include(microbeCard);
  });

  it('should draw 1 card for each microbe tag when playing a card', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    // 使用真实的带有微生物标签的卡牌
    const ants = new Ants();
    const worms = new Worms();

    // 先记录手牌数量
    const initialHandSize = player.cardsInHand.length;

    // 打出一张带有1个微生物标签的卡牌
    player.playCard(ants);
    runAllActions(game);

    // 再打出一张带有1个微生物标签的卡牌
    player.playCard(worms);
    runAllActions(game);

    // 总共应该抽了2张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize+2);

    // 打出非微生物标志时不应该抽牌
    player.playCard(new Mine());
    runAllActions(game);
    // 手牌数量不应变化
    expect(player.cardsInHand.length).to.eq(initialHandSize + 2);
  });

  it('should not draw cards when other players play microbe cards', () => {
    // 玩家1打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录玩家1当前手牌数量
    const initialHandSize = player.cardsInHand.length;

    // 玩家2打出带有微生物标签的卡牌
    player2.playCard(new Ants());
    runAllActions(game);

    // 玩家2再打出一张带有微生物标签的卡牌
    player2.playCard(new Worms());
    runAllActions(game);

    // 玩家1的手牌数量不应该增加
    expect(player.cardsInHand.length).to.eq(initialHandSize);
  });
});
