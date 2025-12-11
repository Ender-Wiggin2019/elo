import {expect} from 'chai';
import {Rda} from '../../../src/server/cards/commission/Rda';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {BoardName} from '../../../src/common/boards/BoardName';

describe('Rda', () => {
  let card: Rda;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Rda();
    [game, player, player2] = testGame(2, {boardName: BoardName.HELLAS, skipInitialShuffling: true});
  });


  it('初始行动应放置一个城市板块', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    player.defer(card.initialAction(player));
    runAllActions(game);

    // 验证等待输入是选择空间
    const input = player.popWaitingFor();
    expect(input).to.exist;
    expect(input).to.be.instanceOf(SelectSpace);

    // 选择一个可用空间放置城市
    const selectSpace = input as SelectSpace;
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);
    runAllActions(game);

    // 验证放置了城市
    expect(space.tile?.tileType).to.eq(TileType.CITY);
    expect(space.player).to.eq(player);
  });

  it('在有单一奖励的地块放置板块时获得额外资源', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);


    // 找一个有植物奖励的地块
    const plantSpace = game.board.getAvailableSpacesOnLand(player)
      .find((space) => space.bonus.includes(SpaceBonus.PLANT) && space.bonus.length === 1);

    if (!plantSpace) {
      // 如果找不到适合的空间，跳过测试
      return;
    }

    // 记录初始植物数量
    const initialPlants = player.plants;

    // 在该地块放置绿化
    game.addGreenery(player, plantSpace);
    runAllActions(game);


    // 验证获得了额外的1植物（标准奖励1植物 + RDA额外奖励1植物 = 共2植物）
    expect(player.plants).to.eq(initialPlants + 2);
  });

  it('在有多个奖励的地块放置板块时可选择一种额外资源', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);


    // 找一个有多个奖励的地块
    const multiBonus = game.board.getAvailableSpacesOnLand(player)
      .find((space) => space.bonus.includes(SpaceBonus.STEEL) && space.bonus.includes(SpaceBonus.PLANT) )!;

    expect(multiBonus).to.exist;

    // 记录初始资源数量
    const initialSteel = player.steel;

    // 在该地块放置绿化
    game.addGreenery(player, multiBonus);
    runAllActions(game);

    // 验证获得了选择额外奖励的选项
    const waitingFor = player.getWaitingFor();
    expect(waitingFor).to.be.instanceOf(OrOptions);

    // 如果有钢铁奖励，选择它
    const orOptions = waitingFor as OrOptions;
    const steelOption = orOptions.options.find((option) =>
      option.title.toString().toLowerCase().includes('steel'))!;

    expect(steelOption).to.exist;

    steelOption.cb();
    runAllActions(game);

    const steelBonus = multiBonus.bonus.filter((bonus) => bonus === SpaceBonus.STEEL);

    // 验证获得了额外的钢铁
    expect(player.steel).to.eq(initialSteel + steelBonus.length + 1);
  });


  it('其他玩家放置板块不会触发效果', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);


    // 记录player的六种基础资源
    const initialResources = {
      megaCredits: player.megaCredits,
      steel: player.steel,
      titanium: player.titanium,
      plants: player.plants,
      energy: player.energy,
      heat: player.heat,
    };

    // 找一个有奖励的地块
    const bonusSpace = game.board.getAvailableSpacesOnLand(player2)
      .find((space) => space.bonus.length > 0)!;
    expect(bonusSpace).to.exist;

    // 玩家2放置板块
    game.addGreenery(player2, bonusSpace);
    runAllActions(game);

    // 验证player1没有获得额外资源（没有弹出选择框）
    expect(player.getWaitingFor()).to.be.undefined;

    // 验证player的六种基础资源没有变化
    expect(player.megaCredits).to.eq(initialResources.megaCredits);
    expect(player.steel).to.eq(initialResources.steel);
    expect(player.titanium).to.eq(initialResources.titanium);
    expect(player.plants).to.eq(initialResources.plants);
    expect(player.energy).to.eq(initialResources.energy);
    expect(player.heat).to.eq(initialResources.heat);
  });
});
