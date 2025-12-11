import {expect} from 'chai';
import {UniversalResourceConverter} from '../../../src/server/cards/commission/UniversalResourceConverter';
import {testGame, runAllActions, cast} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {CardResource} from '../../../src/common/CardResource';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';
import {AddResourcesToCard} from '../../../src/server/deferredActions/AddResourcesToCard';
import {SelectCard} from '../../../src/server/inputs/SelectCard';

describe('UniversalResourceConverter', () => {
  let card: UniversalResourceConverter;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new UniversalResourceConverter();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.playCard(card);
  });


  it('资源放置与分数计算正确（每3资源1分）', () => {
    // 测试不同资源数量下的分数计算

    // 没有资源时
    card.resourceCount = 0;
    expect(player.getVictoryPoints().victoryPoints).to.eq(0); // 只有TR分数

    // 1个资源时
    card.resourceCount = 1;
    expect(player.getVictoryPoints().victoryPoints).to.eq(0); // 不足3个资源不得分

    // 3个资源时
    card.resourceCount = 3;
    expect(player.getVictoryPoints().victoryPoints).to.eq(1); // TR 20分 + 卡牌1分

    // 6个资源时
    card.resourceCount = 6;
    expect(player.getVictoryPoints().victoryPoints).to.eq(2); // TR 20分 + 卡牌2分

    // 9个资源时
    card.resourceCount = 9;
    expect(player.getVictoryPoints().victoryPoints).to.eq(3); // TR 20分 + 卡牌3分

    // 非整数倍情况
    card.resourceCount = 7;
    expect(player.getVictoryPoints().victoryPoints).to.eq(2); // TR 20分 + 卡牌2分 (7/3=2.33，向下取整为2)
  });

  it('可以接收其他卡牌的资源', () => {
    // 创建一个添加资源的动作，模拟从其他卡牌转移资源
    const addResourceAction = new AddResourcesToCard(player, CardResource.ANIMAL);
    game.defer(addResourceAction);
    runAllActions(game);

    // 验证资源已添加
    expect(card.resourceCount).to.eq(1);
  });

  it('可以接收多种不同类型的资源', () => {
    // 添加微生物资源
    const tardigrades = new Tardigrades();
    player.playCard(tardigrades);
    tardigrades.resourceCount = 2; // 添加2个微生物资源

    // 创建添加微生物资源的动作
    game.defer(new AddResourcesToCard(player, CardResource.MICROBE));
    runAllActions(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards).to.have.members([card, tardigrades]);
    selectCard.cb([card]);

    // 验证资源已添加
    expect(card.resourceCount).eq(1);
    expect(tardigrades.resourceCount).to.eq(2);
  });
});
