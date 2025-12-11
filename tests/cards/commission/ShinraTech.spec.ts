import {expect} from 'chai';
import {ShinraTech} from '../../../src/server/cards/commission/ShinraTech';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {Tag} from '../../../src/common/cards/Tag';
import {PowerPlant} from '../../../src/server/cards/base/PowerPlant';
import {GeothermalPower} from '../../../src/server/cards/base/GeothermalPower';

describe('ShinraTech', () => {
  let card: ShinraTech;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ShinraTech();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('初始资金为39 M€，初始行动增加电力生产并获得1卡', () => {
    // 记录初始能源生产
    const initialEnergyProduction = player.production.energy;

    // 记录初始MC生产
    const initialMCProduction = player.production.megacredits;

    // 记录初始手牌数量
    const initialHandSize = player.cardsInHand.length;

    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 验证初始资金
    expect(card.startingMegaCredits).to.eq(39);

    // 验证能源生产增加2
    expect(player.production.energy).to.eq(initialEnergyProduction + 2);

    // 验证MC生产增加2
    expect(player.production.megacredits).to.eq(initialMCProduction + 2);

    // 验证抽了1张卡
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);

    // 验证抽到的是能源标签卡
    const powerCards = player.cardsInHand.filter((card) => card.tags.includes(Tag.POWER));
    expect(powerCards.length).to.eq(1);
  });

  it('当有玩家打出能源标签卡，公司卡持有者获得2MC生产', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);
    // 记录初始MC生产
    const initialMCProduction = player.production.megacredits;

    // 打出能源标签卡
    player.playCard(new GeothermalPower());
    runAllActions(game);

    // 验证MC生产增加2 (基础+1，能源标签+1)
    expect(player.production.megacredits).to.eq(initialMCProduction + 2);
  });

  it('当其他玩家打出能源标签卡，不获得2MC生产', () => {
    // 获取另一个玩家
    const player2 = game.getPlayerById(game.getPlayerAfter(player).id);
    player2.megaCredits = 100;


    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始MC生产
    const initialMCProduction = player.production.megacredits;

    player2.playCard(new PowerPlant());
    runAllActions(game);

    // 验证MC生产增加4 (2个能源标签 * 2)
    expect(player.production.megacredits).to.eq(initialMCProduction );
  });
});
