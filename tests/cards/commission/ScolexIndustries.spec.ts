import {expect} from 'chai';
import {ScolexIndustries} from '../../../src/server/cards/commission/ScolexIndustries';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';

describe('ScolexIndustries', () => {
  let card: ScolexIndustries;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ScolexIndustries();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('初始资金为40 M€，各资源产量+1', () => {
    // 记录初始产量
    const initialSteelProduction = player.production.steel;
    const initialTitaniumProduction = player.production.titanium;
    const initialPlantsProduction = player.production.plants;
    const initialEnergyProduction = player.production.energy;

    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 验证初始资金
    expect(card.startingMegaCredits).to.equal(40);

    // 验证各资源产量增加了1
    expect(player.production.steel).to.equal(initialSteelProduction + 1);
    expect(player.production.titanium).to.equal(initialTitaniumProduction + 1);
    expect(player.production.plants).to.equal(initialPlantsProduction + 1);
    expect(player.production.energy).to.equal(initialEnergyProduction + 1);
  });

  it('没有可减少的产量时不能执行行动', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置所有产量为0
    player.production.override({
      megacredits: player.production.megacredits,
      steel: 0,
      titanium: 0,
      plants: 0,
      energy: 0,
      heat: 0,
    });

    // 验证不能执行行动
    expect(card.canAct(player)).to.be.false;
  });

  it('行动可以减少一种产量并增加另一种产量', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 确保可以执行行动
    expect(card.canAct(player)).to.be.true;

    // 执行行动
    card.action(player);
    runAllActions(game);

    // 获取减少产量的选项
    const decreaseOptions = cast(player.popWaitingFor(), OrOptions);

    // 选择减少钢铁产量
    const decreaseSteelOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease steel production'),
    );

    expect(decreaseSteelOption).to.not.be.undefined;
    decreaseSteelOption!.cb();
    runAllActions(game);

    // 获取增加产量的选项
    const increaseOptions = cast(player.popWaitingFor(), OrOptions);

    // 选择增加热能产量
    const increaseHeatOption = increaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Increase heat production'),
    );

    expect(increaseHeatOption).to.not.be.undefined;
    increaseHeatOption!.cb();
    runAllActions(game);

    // 验证钢铁产量减少了1，热能产量增加了1
    expect(player.production.steel).to.equal(0);
    expect(player.production.heat).to.equal(1);
  });

  it('减少产量选项应该只包含玩家有的产量', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置特定产量
    player.production.override({
      megacredits: player.production.megacredits,
      steel: 1,
      titanium: 0, // 钛产量为0
      plants: 1,
      energy: 1,
      heat: 0, // 热能产量为0
    });

    // 执行行动
    card.action(player);
    runAllActions(game);

    // 获取减少产量的选项
    const decreaseOptions = cast(player.popWaitingFor(), OrOptions);

    // 验证选项不包含钛和热能产量
    const decreaseTitaniumOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease titanium production'),
    );

    const decreaseHeatOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease heat production'),
    );

    expect(decreaseTitaniumOption).to.be.undefined;
    expect(decreaseHeatOption).to.be.undefined;

    // 验证选项包含钢铁、植物和能源产量
    const decreaseSteelOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease steel production'),
    );

    const decreasePlantsOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease plants production'),
    );

    const decreaseEnergyOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease energy production'),
    );

    expect(decreaseSteelOption).to.not.be.undefined;
    expect(decreasePlantsOption).to.not.be.undefined;
    expect(decreaseEnergyOption).to.not.be.undefined;
  });

  it('增加产量选项应该包含所有可能的产量', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 执行行动
    card.action(player);
    runAllActions(game);

    // 获取减少产量的选项
    const decreaseOptions = cast(player.popWaitingFor(), OrOptions);

    // 选择减少钢铁产量
    const decreaseSteelOption = decreaseOptions.options.find((option) =>
      typeof option.title === 'string' && option.title.includes('Decrease steel production'),
    );

    decreaseSteelOption!.cb();
    runAllActions(game);

    // 获取增加产量的选项
    const increaseOptions = cast(player.popWaitingFor(), OrOptions);

    // 验证选项包含所有可能的产量
    const resources = [
      'Increase megacredits production',
      'Increase steel production',
      'Increase titanium production',
      'Increase plants production',
      'Increase energy production',
      'Increase heat production',
    ];

    // 验证所有资源产量选项都存在
    resources.forEach((resource) => {
      const option = increaseOptions.options.find((option) =>
        typeof option.title === 'string' && option.title.includes(resource),
      );
      expect(option).to.not.be.undefined;
    });
  });
});
