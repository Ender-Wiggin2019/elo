import {expect} from 'chai';
import {HayMaker} from '../../../src/server/cards/eros/HayMaker';
import {CardName} from '../../../src/common/cards/CardName';
import {testGame, cast, addGreenery} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Resource} from '../../../src/common/Resource';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';


describe('HayMaker', () => {
  let card: HayMaker;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new HayMaker();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('should not be playable if no greenery', () => {
    // 没有绿地
    expect(card.canPlay(player)).to.be.false;
  });

  it('should play, remove greenery, place neutral tile, gain 12 heat', () => {
    // 先放一个自己的绿地
    const space = addGreenery(player);
    expect(card.canPlay(player)).to.be.true;
    const greenerySpaces = game.board.getGreeneries(player);
    expect(greenerySpaces.length).to.eq(1);
    // 打出卡牌
    player.playCard(card);
    // deferred action: 选择要移除的绿地
    const selectSpace = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    // 选择刚才的绿地
    selectSpace.cb(space!);
    // 断言绿地被移除，变为中立方块
    expect(game.board.getGreeneries(player).length).to.eq(0);
    expect(space!.tile?.tileType).to.eq(TileType.MARTIAN_NATURE_WONDERS);
    expect(player.stock.get(Resource.HEAT)).to.eq(12);
    expect(player.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player.playedCards.get(CardName.HAY_MAKER)).to.exist;
  });

  it('should persist after serialization/deserialization', () => {
    // 放一个绿地
    const space = addGreenery(player);
    player.playCard(card);
    const selectSpace = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    selectSpace.cb(space!);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(CardName.HAY_MAKER);
    expect(card2).to.exist;
    expect(player2.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player2.stock.get(Resource.HEAT)).to.eq(12);
    // 绿地已变为中立方块
    const space2 = game2.board.spaces.find((s: any) => s.id === space!.id);
    expect(space2!.tile?.tileType).to.eq(TileType.MARTIAN_NATURE_WONDERS);
  });
});
