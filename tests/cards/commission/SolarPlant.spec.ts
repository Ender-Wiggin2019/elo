import {expect} from 'chai';
import {SolarPlant} from '../../../src/server/cards/commission/SolarPlant';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {Resource} from '../../../src/common/Resource';
import {Phase} from '../../../src/common/Phase';

describe('SolarPlant', () => {
  let card: SolarPlant;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SolarPlant();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('初始资金为45 M€，并有初始行动获得能源产量与资源', () => {
    // 记录初始产量
    const initialEnergyProduction = player.production.energy;
    const initialEnergy = player.energy;

    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 验证能源产量增加2
    expect(player.production.energy).to.eq(initialEnergyProduction + 2);

    // 验证获得3能源
    expect(player.energy).to.eq(initialEnergy + 3);
  });

  it('行动可以消耗2热能产量换取2电力产量', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置足够的热能产量
    player.production.add(Resource.HEAT, 2);

    // 记录初始产量
    const initialHeatProduction = player.production.heat;
    const initialEnergyProduction = player.production.energy;

    // 使用行动
    expect(card.canAct(player)).to.be.true;

    const action = card.action(player);

    // 选择减少2点热能产量
    const selectAmount = action;
    selectAmount.cb(2);

    runAllActions(game);

    // 验证热能产量减少2
    expect(player.production.heat).to.eq(initialHeatProduction - 2);

    // 验证能源产量增加2
    expect(player.production.energy).to.eq(initialEnergyProduction + 2);
  });

  it('没有足够的热能产量时无法使用行动', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置不足的热能产量
    player.production.add(Resource.HEAT, -player.production.get(Resource.HEAT));

    // 无法使用行动
    expect(card.canAct(player)).to.be.false;
  });

  it('在行动阶段消耗电力时获得等量热能', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置资源初始值
    player.energy = 5;
    player.heat = 0;

    // 确保是行动阶段
    game.phase = Phase.ACTION;

    // 消耗3点电力
    player.stock.deduct(Resource.ENERGY, 3, {log: true});
    runAllActions(game);

    // 验证电力减少了3点
    expect(player.energy).to.eq(2);

    // 验证获得了3点热能
    expect(player.heat).to.eq(3);
  });

  it('不在行动阶段消耗电力时不获得热能', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置资源初始值
    player.energy = 5;
    player.heat = 0;

    // 设置为非行动阶段
    game.phase = Phase.SOLAR;

    // 消耗3点电力
    player.stock.deduct(Resource.ENERGY, 3, {log: true});
    runAllActions(game);

    // 验证电力减少了3点
    expect(player.energy).to.eq(2);

    // 验证热能没有增加
    expect(player.heat).to.eq(0);
  });
});
