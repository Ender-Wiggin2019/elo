import {expect} from 'chai';
import {UniqueItemBounty} from '../../../src/server/cards/commission/UniqueItemBounty';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast, runAllActions} from '../../TestingUtils';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Fish} from '../../../src/server/cards/base/Fish';
import {setTemperature} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {RotatorImpacts} from '../../../src/server/cards/venusNext/RotatorImpacts';
import {SecurityFleet} from '../../../src/server/cards/base/SecurityFleet';
import {RefugeeCamps} from '../../../src/server/cards/colonies/RefugeeCamps';
import {Hospitals} from '../../../src/server/cards/promo/Hospitals';
import {CarbonNanosystems} from '../../../src/server/cards/promo/CarbonNanosystems';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';

describe('UniqueItemBounty', () => {
  let card: UniqueItemBounty;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new UniqueItemBounty();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
    setTemperature(game, -4); // 设置温度满足卡牌要求
  });

  it('基本属性正确', () => {
    expect(card.tags).to.deep.eq([Tag.PLANT]);
    expect(card.cost).to.eq(12);
    expect(card.type).to.eq(CardType.EVENT);

    // 验证卡牌要求
    expect(card.requirements[0].temperature).to.eq(-4);
  });

  it('温度低于要求时不能打出', () => {
    setTemperature(game, -6); // 设置温度低于要求

    expect(player.canPlay(card)).to.be.false;

    setTemperature(game, -4); // 设置温度满足要求

    expect(player.canPlay(card)).to.be.true;
  });


  it('根据非标准资源选择获得热量', () => {
    // 准备2种不同的非标准资源卡
    const tardigrades = new Tardigrades(); // 使用微生物资源
    const fish = new Fish(); // 使用动物资源

    player.playCard(tardigrades);
    player.playCard(fish);
    tardigrades.action(player);
    fish.action(player);
    runAllActions(game);

    // 记录初始资源数量
    const initialHeat = player.heat;

    player.playCard(card);
    runAllActions(game);

    // 打出卡牌并选择热量
    const action = cast(player.popWaitingFor(), OrOptions);
    action.options[0].cb(); // 选择热量

    // 验证获得了6点热量（2种非标准资源 * 3热量）
    expect(player.heat).to.eq(initialHeat + 6);
  });

  it('根据非标准资源选择获得植物', () => {
    // 准备2种不同的非标准资源卡
    const tardigrades = new Tardigrades(); // 使用微生物资源
    const fish = new Fish(); // 使用动物资源

    player.playCard(tardigrades);
    player.playCard(fish);
    tardigrades.action(player);
    fish.action(player);
    runAllActions(game);

    // 记录初始资源数量
    const initialPlants = player.plants;

    player.playCard(card);
    runAllActions(game);

    // 打出卡牌并选择植物
    const action = cast(player.popWaitingFor(), OrOptions);
    action.options[1].cb(); // 选择植物

    // 验证获得了4点植物（2种非标准资源 * 2植物）
    expect(player.plants).to.eq(initialPlants + 4);
  });

  it('没有非标准资源时不提供选择', () => {
    // 没有打出任何带资源的卡牌
    player.playCard(card);
    runAllActions(game);

    // 验证没有提供选择
    expect(player.popWaitingFor()).to.be.undefined;
  });

  it('最多只计算8种非标准资源', () => {
    // 使用实际的资源卡牌
    const cardsToPlay = [
      new Ants(), // 微生物
      new Fish(), // 动物
      new SecurityFleet(), // 战斗机
      new Dirigibles(), // 云
      new RotatorImpacts(), // 陨石
      new RefugeeCamps(), // 难民
      new SearchForLife(), // 科学
      new Hospitals(), // 疾病
      new CarbonNanosystems(), // 石墨烯
    ];

    // 让已有的资源卡有更多种类
    cardsToPlay.forEach((card) => {
      player.playCard(card);
      card.resourceCount = 1;
    });

    runAllActions(game);


    // 记录初始资源
    const initialHeat = player.heat;

    player.playCard(card);
    runAllActions(game);


    // 打出卡牌并选择热量
    const action = cast(player.popWaitingFor(), OrOptions);
    action.options[0].cb(); // 选择热量

    // 验证最多只获得24点热量（8种非标准资源 * 3热量）
    expect(player.heat).to.eq(initialHeat + 24);
  });
});
