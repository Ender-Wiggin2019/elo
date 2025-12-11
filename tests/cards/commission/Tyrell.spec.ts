import {expect} from 'chai';
import {Tyrell} from '../../../src/server/cards/commission/Tyrell';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {addCity, cast, runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IndustrialCenter} from '../../../src/server/cards/base/IndustrialCenter';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Resource} from '../../../src/common/Resource';

describe('Tyrell', () => {
  let card: Tyrell;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Tyrell();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
  });


  it('没有可用行动卡时不能执行行动', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 在测试开始时，其他玩家没有打出任何带行动的卡
    expect(card.canAct(player)).to.be.false;
  });

  it('可以使用其他玩家的非资源行动卡', () => {
    addCity(player);
    const industrialCenter = new IndustrialCenter();
    player2.playCard(industrialCenter);
    runAllActions(game);

    // 设置玩家2的牌行动可用（为测试目的）
    player2.megaCredits = 7; // IndustrialCenter 需要7 MC来执行行动
    expect(industrialCenter.canAct(player2)).to.be.true;

    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置玩家1也有足够的资源执行IndustrialCenter行动
    player.megaCredits = 6;
    expect(card.canAct(player)).to.be.false;
    // 验证可以执行行动
    player.megaCredits = 7;
    expect(card.canAct(player)).to.be.true;

    // 执行行动
    const action = card.action(player);
    expect(action).to.be.instanceOf(SelectCard);

    // 验证选择卡牌包含IndustrialCenter
    const selectCard = cast(action, SelectCard);
    expect(selectCard.cards).to.include(industrialCenter);

    // 选择IndustrialCenter并执行其行动
    selectCard.cb([industrialCenter]);
    runAllActions(game);

    // IndustrialCenter的行动效果是消耗7MC，获得1钢铁产量
    // 玩家MC应减少7
    expect(player.megaCredits).to.eq(0);
    // 玩家钢铁产量应增加1
    expect(player.production.get(Resource.STEEL)).to.eq(1);
  });

  it('不能使用带资源的行动卡', () => {
    // 玩家2打出一张带资源的行动卡（Ants）
    const ants = new Ants();
    player2.playCard(ants);
    ants.resourceCount = 3; // 添加一些微生物资源
    runAllActions(game);

    // 玩家2也打出一张不带资源的行动卡
    addCity(player);
    const industrialCenter = new IndustrialCenter();
    player2.playCard(industrialCenter);
    player2.megaCredits = 7;
    runAllActions(game);

    // 打出公司卡
    player.playCorporationCard(card);
    player.megaCredits = 7; // 有足够的MC执行IndustrialCenter
    runAllActions(game);

    // 验证可以执行行动
    expect(card.canAct(player)).to.be.true;

    // 执行行动
    const action = card.action(player);
    const selectCard = cast(action, SelectCard);

    // 验证选择卡牌不包含Ants（带资源卡）
    expect(selectCard.cards).to.not.include(ants);

    // 验证选择卡牌包含IndustrialCenter（非资源卡）
    expect(selectCard.cards).to.include(industrialCenter);
  });
});
