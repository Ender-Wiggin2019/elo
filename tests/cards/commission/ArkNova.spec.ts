import {expect} from 'chai';
import {ArkNova} from '../../../src/server/cards/commission/ArkNova';
import {testGame, runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {UrbanizedArea} from '../../../src/server/cards/base/UrbanizedArea';
import {Mine} from '../../../src/server/cards/base/Mine';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';
import {Greenhouses} from '../../../src/server/cards/base/Greenhouses';
import {GeothermalPower} from '../../../src/server/cards/base/GeothermalPower';
import {IndustrialMicrobes} from '../../../src/server/cards/base/IndustrialMicrobes';
import {OlympusConference} from '../../../src/server/cards/base/OlympusConference';
import {HousePrinting} from '../../../src/server/cards/prelude/HousePrinting';


describe('ArkNova', () => {
  let card: ArkNova;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ArkNova();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.playCorporationCard(card);
  });

  it('初始资金为49，初始动物资源2，分数为0', () => {
    expect(card.resourceCount).to.eq(2);
    // 初始时没有building标签所以卡牌分数为0
    expect(card.getVictoryPoints(player)).to.eq(0);
    // 确认总分也是0（此时只有基础TR分20分）
    expect(player.getVictoryPoints().victoryPoints).to.eq(0);
  });

  it('打出building/city tag牌时获得动物资源', () => {
    card.resourceCount = 0;

    player.playCard(new Mine());
    runAllActions(game);
    expect(card.resourceCount).to.be.eq(1);

    player.playCard(new GanymedeColony());
    runAllActions(game);
    expect(card.resourceCount).to.be.eq(2);
  });

  it('动物资源达到3时自动转化为1钢铁并抽1牌', () => {
    card.resourceCount = 2;
    const steelBefore = player.steel;
    const handBefore = player.cardsInHand.length;
    player.playCard(new Mine());
    expect(player.steel - steelBefore).to.eq(1);
    expect(player.cardsInHand.length - handBefore).to.eq(1);
    expect(card.resourceCount).to.eq(0);
  });

  it('多个building标签时分数计算正确', () => {
    // ArkNova 每4个building标签获得1分
    // ArkNova 自身有1个building标签
    const urbanizedArea = new UrbanizedArea(); // building + city
    const mine = new Mine(); // building
    const greenhouses = new Greenhouses(); // building + space


    // 验证初始分数
    expect(card.getVictoryPoints(player)).to.eq(0); // 1个building标签不够获得分数

    // 添加1张building标签卡片
    player.playCard(urbanizedArea);
    expect(card.getVictoryPoints(player)).to.eq(0); // 2个building标签不够获得分数

    // 添加1张building标签卡片
    player.playCard(mine);
    expect(card.getVictoryPoints(player)).to.eq(0); // 3个building标签不够获得分数

    // 添加最后1张building标签卡片，达到4个
    player.playCard(greenhouses);
    expect(card.getVictoryPoints(player)).to.eq(1); // 4个building标签获得1分

    // 获取总分明细，确认卡牌分数被正确计入
    const vp = player.getVictoryPoints();
    expect(vp.victoryPoints).to.eq(1); // 卡牌贡献1分
    expect(vp.total).to.eq(21); // 基础TR 20分 + 卡牌1分 = 21

    // 再添加4张mine，增加4个building标签
    player.playCard(new GeothermalPower());
    player.playCard(new HousePrinting());// 1vp
    player.playCard(new IndustrialMicrobes());
    player.playCard(new OlympusConference());// 1vp
    expect(card.getVictoryPoints(player)).to.eq(2); // 8个building标签获得2分

    // 再次确认总分明细
    const vp2 = player.getVictoryPoints();
    expect(vp2.victoryPoints).to.eq(2 + 2); // 卡牌贡献2分
  });
});
