import {expect} from 'chai';
import {LostBounty} from '../../../src/server/cards/commission/LostBounty';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {Tag} from '../../../src/common/cards/Tag';
import {CardType} from '../../../src/common/cards/CardType';
import {Resource} from '../../../src/common/Resource';

describe('LostBounty', () => {
  let card: LostBounty;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new LostBounty();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('基本属性正确', () => {
    expect(card.cost).to.eq(12);
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.BUILDING]);
  });

  it('打出时减少MC产1级并增加钛产1级', () => {
    const initialMCProd = player.production.megacredits;
    const initialTiProd = player.production.titanium;

    player.playCard(card);
    runAllActions(game);

    // 产能变化
    expect(player.production.megacredits).to.eq(initialMCProd - 1);
    expect(player.production.titanium).to.eq(initialTiProd + 1);
  });

  it('其他卡牌减少产能时也触发获得2MC', () => {
    player.playCard(card);
    runAllActions(game);

    const mcAfterPlay = player.megaCredits;

    // 模拟其他效果减少钢铁产能
    player.production.add(Resource.STEEL, -1, {log: true});
    runAllActions(game);

    expect(player.megaCredits).to.eq(mcAfterPlay + 2);
  });

  it('产能增加时不触发', () => {
    player.playCard(card);
    runAllActions(game);

    const mcAfterPlay = player.megaCredits;

    // 增加产能
    player.production.add(Resource.PLANTS, 2, {log: true});
    runAllActions(game);

    // MC不应因产能增加而增加
    expect(player.megaCredits).to.eq(mcAfterPlay);
  });

  it('多种产能同时减少时每种各触发一次', () => {
    player.playCard(card);
    runAllActions(game);

    const mcAfterPlay = player.megaCredits;

    // 减少两种不同产能
    player.production.add(Resource.STEEL, -1, {log: true});
    player.production.add(Resource.ENERGY, -1, {log: true});
    runAllActions(game);

    // 每次产能减少各触发一次2MC，共4MC
    expect(player.megaCredits).to.eq(mcAfterPlay + 4);
  });

  it('任意资源类型的产能减少都触发', () => {
    player.playCard(card);
    runAllActions(game);

    // 先给玩家一些产能用于减少
    player.production.add(Resource.HEAT, 3);
    player.production.add(Resource.ENERGY, 3);
    player.production.add(Resource.PLANTS, 3);
    runAllActions(game);

    const mcAfterSetup = player.megaCredits;

    // 减少热产
    player.production.add(Resource.HEAT, -1, {log: true});
    runAllActions(game);
    expect(player.megaCredits).to.eq(mcAfterSetup + 2);

    // 减少电产
    player.production.add(Resource.ENERGY, -1, {log: true});
    runAllActions(game);
    expect(player.megaCredits).to.eq(mcAfterSetup + 4);

    // 减少植物产
    player.production.add(Resource.PLANTS, -1, {log: true});
    runAllActions(game);
    expect(player.megaCredits).to.eq(mcAfterSetup + 6);
  });
});
