import {expect} from 'chai';
import {PlanetaryMeteorHarvesters} from '../../../src/server/cards/commission/PlanetaryMeteorHarvesters';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, runAllActions} from '../../TestingUtils';
import {ResearchOutpost} from '../../../src/server/cards/base/ResearchOutpost';
import {IGame} from '../../../src/server/IGame';
import {SpaceElevator} from '../../../src/server/cards/base/SpaceElevator';
import {AsteroidRights} from '../../../src/server/cards/promo/AsteroidRights';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {AsteroidHollowing} from '../../../src/server/cards/promo/AsteroidHollowing';

describe('PlanetaryMeteorHarvesters', () => {
  let card: PlanetaryMeteorHarvesters;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PlanetaryMeteorHarvesters();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
    player2.megaCredits = 100;
  });

  it('should gain asteroid when playing space tag card', () => {
    player.playCard(card);
    runAllActions(game);
    // 打出自身时获得1陨石
    expect(card.resourceCount).to.eq(1);
    // 再打出一张带space tag的牌
    const outpost = new SpaceElevator();
    player.playCard(outpost);
    runAllActions(game);
    expect(card.resourceCount).to.eq(2);
  });

  it('should move asteroid to another card', () => {
    player.playCard(card);
    runAllActions(game);
    // 再打出一张带space tag的牌
    const outpost = new SpaceElevator();
    player.playCard(outpost);
    runAllActions(game);
    // 模拟拥有另一张可放陨石的牌
    const another = new AsteroidRights();
    player.playCard(another);
    runAllActions(game);
    // 行动可用
    expect(card.canAct(player)).to.be.true;
    // 执行动作
    card.resourceCount = 1;
    another.resourceCount = 0;
    card.action(player);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(another.resourceCount).to.eq(1);
  });

  it('should move asteroid to another chosen card', () => {
    player.playCard(card);
    runAllActions(game);
    // 再打出一张带space tag的牌
    const outpost = new SpaceElevator();
    player.playCard(outpost);
    runAllActions(game);
    // 模拟拥有另一张可放陨石的牌
    const another = new AsteroidRights();
    player.playCard(another);
    player.playCard(new AsteroidHollowing());
    runAllActions(game);
    // 行动可用
    expect(card.canAct(player)).to.be.true;
    // 执行动作
    card.resourceCount = 1;
    another.resourceCount = 0;
    card.action(player);
    runAllActions(game);
    // 处理等待输入，确认类型为SelectCard
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([another]);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(another.resourceCount).to.eq(1);
  });

  it('should calculate victory points by asteroid count', () => {
    // 测试初始状态
    expect(card.getVictoryPoints(player)).to.eq(0);

    // 将卡牌添加到玩家的已打出卡牌中
    player.playCard(card);
    runAllActions(game);

    // 基础分数状态检查（只有TR贡献分数）
    const initialVP = player.getVictoryPoints();
    expect(initialVP.victoryPoints).to.eq(0); // 卡牌没有贡献分数
    expect(initialVP.total).to.eq(20); // 只有TR贡献的分数

    // 测试2个陨石资源时的分数
    card.resourceCount = 2;
    expect(card.getVictoryPoints(player)).to.eq(0); // 低于3个陨石不得分
    const vp1 = player.getVictoryPoints();
    expect(vp1.victoryPoints).to.eq(0);
    expect(vp1.total).to.eq(20);

    // 测试3个陨石资源时的分数
    card.resourceCount = 3;
    expect(card.getVictoryPoints(player)).to.eq(1); // 3个陨石得1分
    const vp2 = player.getVictoryPoints();
    expect(vp2.victoryPoints).to.eq(1);
    expect(vp2.total).to.eq(21); // TR 20分 + 卡牌1分

    // 测试6个陨石资源时的分数
    card.resourceCount = 6;
    expect(card.getVictoryPoints(player)).to.eq(2); // 6个陨石得2分
    const vp3 = player.getVictoryPoints();
    expect(vp3.victoryPoints).to.eq(2);
    expect(vp3.total).to.eq(22); // TR 20分 + 卡牌2分

    // 测试9个陨石资源时的分数
    card.resourceCount = 9;
    expect(card.getVictoryPoints(player)).to.eq(3); // 9个陨石得3分
    const vp4 = player.getVictoryPoints();
    expect(vp4.victoryPoints).to.eq(3);
    expect(vp4.total).to.eq(23); // TR 20分 + 卡牌3分
  });

  it('should not gain asteroid when other players play space tag cards', () => {
    // 玩家1打出卡牌
    player.playCard(card);
    runAllActions(game);

    // 记录初始陨石数量
    const initialAsteroidCount = card.resourceCount;

    // 玩家2打出带有太空标签的卡牌
    const outpost = new ResearchOutpost();
    player2.playCard(outpost);
    runAllActions(game);

    // 玩家1的卡牌陨石数量不应该增加
    expect(card.resourceCount).to.eq(initialAsteroidCount);
  });
});
