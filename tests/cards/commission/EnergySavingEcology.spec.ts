import {expect} from 'chai';
import {EnergySavingEcology} from '../../../src/server/cards/commission/EnergySavingEcology';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, cast} from '../../TestingUtils';
import {Resource} from '../../../src/common/Resource';
import {IGame} from '../../../src/server/IGame';
import {Worms} from '../../../src/server/cards/base/Worms';
import {SolarReflectors} from '../../../src/server/cards/colonies/SolarReflectors';
import {ImportedGHG} from '../../../src/server/cards/base/ImportedGHG';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {Soletta} from '../../../src/server/cards/base/Soletta';

describe('EnergySavingEcology', () => {
  let card: EnergySavingEcology;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new EnergySavingEcology();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('should start with 47 M€ and 2 heat production', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    expect(card.startingMegaCredits).to.equal(47);
    expect(player.production.get(Resource.HEAT)).to.equal(2);
    expect(card.resourceCount).to.equal(1);
  });

  it('should add asteroid resource when playing card with cost <= 10', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始资源数量
    const initialResources = card.resourceCount;

    // 使用一张真实的成本为8的卡牌
    const worms = new Worms(); // Worms的成本是8
    player.playCard(worms);
    runAllActions(game);

    // 卡牌应该增加了资源
    expect(card.resourceCount).to.eq(initialResources+1);
  });

  it('should add asteroid resource when heat production increases', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始资源数量
    const initialResources = card.resourceCount;

    // 增加热能生产
    player.playCard(new SolarReflectors());
    runAllActions(game);

    // 卡牌应该增加了资源
    expect(card.resourceCount).to.eq(initialResources + 1);


    // 增加热能生产  同时费用低于10
    player.playCard(new ImportedGHG());
    runAllActions(game);

    // 卡牌应该增加了资源
    expect(card.resourceCount).to.eq(initialResources + 3);
  });

  it('should be able to place an ocean tile by removing 4 asteroid resources', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 添加足够的资源来放置海洋
    card.resourceCount = 4;

    // 增加一张便宜的卡牌来触发能力
    player.playCard(new Worms());
    runAllActions(game);

    // 选择使用移除资源放置海洋
    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[1].cb();
    runAllActions(game);

    // 检查资源已被移除
    expect(card.resourceCount).to.eq(0);

    // 选择放置海洋的位置
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);

    // 确认海洋已被放置
    expect(space.tile?.tileType).to.eq(TileType.OCEAN);
    expect(game.board.getOceanSpaces().length).to.eq(1);
  });

  it('should be able to place a greenery tile by removing 6 asteroid resources', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 添加足够的资源来放置绿地
    card.resourceCount = 6;

    // 增加热能生产来触发能力
    player.playCard(new Soletta());
    runAllActions(game);

    // 选择使用移除资源放置绿地
    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[2].cb();
    runAllActions(game);

    // 检查资源已被移除
    expect(card.resourceCount).to.eq(0);

    // 选择放置绿地的位置
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);

    // 确认绿地已被放置
    expect(space.tile?.tileType).to.eq(TileType.GREENERY);
    expect(game.board.getGreeneries().length).to.eq(1);
  });
});
