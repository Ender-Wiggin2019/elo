import {expect} from 'chai';
import {RaincatScientificProbe} from '../../../src/server/cards/commission/RaincatScientificProbe';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {Research} from '../../../src/server/cards/base/Research';

describe('RaincatScientificProbe', () => {
  let card: RaincatScientificProbe;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new RaincatScientificProbe();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });


  it('初始资金为44 M€，初始拥有1个科学资源', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 验证初始资金
    expect(card.startingMegaCredits).to.equal(44);
    // 验证初始有1个科学资源
    expect(card.resourceCount).to.equal(1);
  });

  it('每打出1张卡牌获得1个科学资源', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始科学资源数量
    const initialScienceCount = card.resourceCount;

    // 打出1张卡牌
    const research = new Research();
    player.playCard(research);
    runAllActions(game);

    // 验证科学资源增加了1个
    expect(card.resourceCount).to.eq(initialScienceCount + 1);
  });

  it('科学资源达到6个时可以选择获得3钢铁', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置5个科学资源(加上初始1个，共6个)
    card.resourceCount = 5;

    // 记录初始钢铁数量
    const initialSteel = player.steel;

    // 添加1个科学资源触发效果
    player.playCard(new Research);
    runAllActions(game);


    // 获取选项
    const orOptions = cast(player.getWaitingFor(), OrOptions);

    // 选择获得3钢铁
    orOptions.options[0].cb();

    // 验证获得了3钢铁
    expect(player.steel).to.eq(initialSteel + 3);

    // 验证科学资源数量重置为0
    expect(card.resourceCount).to.eq(0);
  });

  it('科学资源达到6个时可以选择获得2钛金属', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置5个科学资源(加上初始1个，共6个)
    card.resourceCount = 5;

    // 记录初始钛金属数量
    const initialTitanium = player.titanium;

    // 添加1个科学资源触发效果
    player.playCard(new Research);
    runAllActions(game);

    // 获取选项
    const orOptions = cast(player.getWaitingFor(), OrOptions);

    // 选择获得2钛金属
    orOptions.options[1].cb();

    // 验证获得了2钛金属
    expect(player.titanium).to.eq(initialTitanium + 2);

    // 验证科学资源数量重置为0
    expect(card.resourceCount).to.eq(0);
  });

  it('科学资源达到6个时可以选择获得4热能', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置5个科学资源(加上初始1个，共6个)
    card.resourceCount = 5;

    // 记录初始热能数量
    const initialHeat = player.heat;

    // 添加1个科学资源触发效果
    player.playCard(new Research);
    runAllActions(game);

    // 获取选项
    const orOptions = cast(player.getWaitingFor(), OrOptions);

    // 选择获得4热能
    orOptions.options[2].cb();

    // 验证获得了4热能
    expect(player.heat).to.eq(initialHeat + 4);

    // 验证科学资源数量重置为0
    expect(card.resourceCount).to.eq(0);
  });

  it('多次累积科学资源到6个可以多次获得资源', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置0个科学资源
    card.resourceCount = 0;

    // 记录初始钢铁数量
    const initialSteel = player.steel;

    // 第一次：添加6个科学资源触发效果
    player.addResourceTo(card, 6);
    runAllActions(game);
    // 获取选项
    const orOptions1 = cast(player.getWaitingFor(), OrOptions);

    // 选择获得3钢铁
    orOptions1.options[0].cb();

    // 验证获得了3钢铁
    expect(player.steel).to.eq(initialSteel + 3);

    // 记录初始钛金属数量
    const initialTitanium = player.titanium;

    // 第二次：添加6个科学资源触发效果
    player.addResourceTo(card, 6);

    // 获取选项
    const orOptions2 = cast(player.getWaitingFor(), OrOptions);

    // 选择获得2钛金属
    orOptions2.options[1].cb();

    // 验证获得了2钛金属
    expect(player.titanium).to.eq(initialTitanium + 2);
  });
});
