import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {WasteIncinerator} from '../../../src/server/cards/eros/WasteIncinerator';
import {TileType} from '../../../src/common/TileType';
import {IGame} from '../../../src/server/IGame';
import {SellPatentsStandardProject} from '../../../src/server/cards/base/standardProjects/SellPatentsStandardProject';
import {PowerPlant} from '../../../src/server/cards/base/PowerPlant';
import {addCity, cast, runAllActions} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';


describe('WasteIncinerator', function() {
  let card: WasteIncinerator;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(function() {
    card = new WasteIncinerator();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 需要有城市相邻地块', function() {
    expect(card.canPlay(player)).to.be.false;
    addCity(player);
    runAllActions(game);
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 会放置废弃物焚化厂地块', function() {
    // 先放一个城市
    addCity(player);
    player.playCard(card);
    runAllActions(game);

    const input = cast(player.popWaitingFor(), SelectSpace);
    const adj = input.spaces[0];
    input!.process({type: 'space', spaceId: adj.id});
    runAllActions(game);

    expect(adj.tile).to.exist;
    expect(adj.tile!.tileType).to.equal(TileType.WASTE_INCINERATOR);
  });

  it('序列化/反序列化后地块信息保留', function() {
    // 先放一个城市
    addCity(player);
    player.playCard(card);
    runAllActions(game);

    const input = cast(player.popWaitingFor(), SelectSpace);
    const adj = input.spaces[0];
    input!.process({type: 'space', spaceId: adj.id});
    runAllActions(game);

    // 序列化
    const serialized = game.serialize();
    const deserialized = game.loadFromJSON(serialized);
    // 检查反序列化后地块依然存在
    const adj2 = deserialized.board.getSpaceOrThrow(adj.id);
    expect(adj2.tile).to.exist;
    expect(adj2.tile!.tileType).to.equal(TileType.WASTE_INCINERATOR);
  });

  it('卖专利时可选择获得热量', function() {
    addCity(player);
    // 打出WasteIncinerator
    player.playCard(card);
    // 给玩家一张真实手牌
    const handCard = new PowerPlant();
    player.cardsInHand.push(handCard);
    // 卖专利
    const sellPatents = new SellPatentsStandardProject();
    const selectCard = cast(sellPatents.action(player), SelectCard);
    // 选择卖出手牌
    const orOptions = selectCard.cb([handCard]);
    expect(orOptions).to.be.instanceOf(OrOptions);
    // 选择“获得热量”
    const heatOption = (orOptions as OrOptions).options.find((opt) => {
      const title = (opt as SelectOption).title;
      return typeof title === 'string' ? title.includes('heat') : String(title).includes('heat');
    }) as SelectOption;
    expect(heatOption).to.exist;
    const heatBefore = player.heat;
    heatOption.cb(undefined);
    expect(player.heat).to.equal(heatBefore + 2);
    expect(player.cardsInHand).to.not.include(handCard);
  });
});
