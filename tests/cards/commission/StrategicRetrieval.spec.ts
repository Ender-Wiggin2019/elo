import {expect} from 'chai';
import {StrategicRetrieval} from '../../../src/server/cards/commission/StrategicRetrieval';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, cast} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {Tag} from '../../../src/common/cards/Tag';
import {Research} from '../../../src/server/cards/base/Research';
import {AsteroidMining} from '../../../src/server/cards/base/AsteroidMining';
import {OpenCity} from '../../../src/server/cards/base/OpenCity';
import {CardType} from '../../../src/common/cards/CardType';
import {SelectCard} from '../../../src/server/inputs/SelectCard';

describe('StrategicRetrieval', () => {
  let card: StrategicRetrieval;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new StrategicRetrieval();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.energy = 2;
  });

  it('基本属性正确', () => {
    expect(card.cost).to.eq(10);
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.SCIENCE, Tag.BUILDING]);
  });

  it('没有足够能源时不能执行行动', () => {
    player.energy = 1; // 能源不足

    // 添加一些卡到弃牌堆
    const research = new Research();
    game.projectDeck.discard(research);

    expect(card.canAct(player)).to.be.false;
  });

  it('弃牌堆为空时不能执行行动', () => {
    player.energy = 2; // 能源足够
    game.projectDeck.discardPile = []; // 弃牌堆为空

    expect(card.canAct(player)).to.be.false;
  });

  it('行动消耗2能源并从弃牌堆抽取卡牌', () => {
    // 添加卡牌到弃牌堆
    const research = new Research();
    const asteroidMining = new AsteroidMining();
    const openCity = new OpenCity();

    game.projectDeck.discard(research);
    game.projectDeck.discard(asteroidMining);
    game.projectDeck.discard(openCity);

    // 记录初始能源和弃牌堆数量
    const initialEnergy = player.energy;
    const initialDiscardSize = game.projectDeck.discardPile.length;

    // 记录玩家初始手牌
    const initialHandSize = player.cardsInHand.length;

    // 执行行动
    expect(card.canAct(player)).to.be.true;
    card.action(player);

    // 验证消耗了2能源
    expect(player.energy).to.eq(initialEnergy - 2);

    // 验证从弃牌堆抽取了卡牌
    expect(game.projectDeck.discardPile.length).to.be.lessThan(initialDiscardSize);

    // 运行所有行动，触发ChooseCards延迟动作
    runAllActions(game);

    // 获取选卡接口
    const selectCard = cast(player.getWaitingFor(), SelectCard);

    // 选择第一张卡
    selectCard.cb([selectCard.cards[0]]);

    // 运行完所有行动
    runAllActions(game);

    // 验证玩家最终应该保留一张卡
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);


    // 验证设置了cardDrew标志
    expect(game.cardDrew).to.be.true;
  });

  it('弃牌堆少于3张卡时只抽取可用的卡', () => {
    // 添加2张卡牌到弃牌堆
    const research = new Research();
    const asteroidMining = new AsteroidMining();

    game.projectDeck.discard(research);
    game.projectDeck.discard(asteroidMining);

    // 记录初始弃牌堆数量
    const initialDiscardSize = game.projectDeck.discardPile.length;
    expect(initialDiscardSize).to.eq(2);

    // 执行行动
    expect(card.canAct(player)).to.be.true;
    card.action(player);

    // 验证从弃牌堆抽取了所有可用的卡
    expect(game.projectDeck.discardPile.length).to.eq(0);
  });
});
