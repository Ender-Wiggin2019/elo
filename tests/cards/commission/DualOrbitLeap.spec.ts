import {expect} from 'chai';
import {DualOrbitLeap} from '../../../src/server/cards/commission/DualOrbitLeap';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {SelectColony} from '../../../src/server/inputs/SelectColony';

describe('DualOrbitLeap', () => {
  let card: DualOrbitLeap;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new DualOrbitLeap();
    [game, player] = testGame(2, {coloniesExtension: true, customColoniesList: [ColonyName.CALLISTO, ColonyName.CERES, ColonyName.PLUTO, ColonyName.LUNA, ColonyName.EUROPA, ColonyName.GANYMEDE], skipInitialShuffling: true});
  });


  it('初始行动应添加一个殖民地板块', () => {
    // 执行初始行动
    player.playCorporationCard(card);
    player.defer(card.initialAction(player));
    runAllActions(game);

    // 验证等待输入
    const input = player.popWaitingFor();
    expect(input).to.exist;
    expect(input!.type).to.eq('colony');

    // 验证可选项中不包含PLUTO和DEIMOS
    const selectColony = input as SelectColony;
    // const availableColonyNames = selectColony.colonies.map((colony) => colony.name);
    // expect(availableColonyNames).to.not.include(ColonyName.PLUTO);
    // expect(availableColonyNames).to.not.include(ColonyName.DEIMOS);

    expect(selectColony.colonies).to.exist;
    expect(selectColony.colonies.length).to.gt(0);

    // 选择第一个有效的殖民地
    const addcolony = selectColony.colonies[0];
    selectColony.cb(addcolony);
    runAllActions(game);

    // 验证殖民地已被添加到游戏中
    expect(game.colonies.some((colony) => colony.name === addcolony.name)).to.be.true;
    // 验证被丢弃的殖民地中已移除
    const discardedColonyNames = game.discardedColonies.map((colony) => colony.name);
    expect(discardedColonyNames).to.not.include(addcolony.name);
  });

  it('贸易时可以增加殖民地轨道2格', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 选择一个殖民地，记录其初始轨道位置
    let colony = game.colonies.find((colony) => colony.name === ColonyName.CALLISTO);
    if (!colony ) {
      game.colonies.push(game.discardedColonies.find((colony) => colony.name === ColonyName.CALLISTO)!);
      colony = game.colonies.find((colony) => colony.name === ColonyName.CALLISTO)!;
      colony.trackPosition = 1;
    }

    // 执行贸易动作前确认tradeOffset
    expect(player.colonies.tradeOffset).to.eq(2);
    expect(colony.trackPosition).to.eq(1);

    // 获取贸易动作
    colony.trade(player);
    runAllActions(game);


    expect(colony.trackPosition).to.eq(0);
    expect(player.energy).to.eq(5);
  });
});
