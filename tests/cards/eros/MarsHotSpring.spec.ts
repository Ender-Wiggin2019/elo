import {expect} from 'chai';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {MarsHotSpring} from '../../../src/server/cards/eros/MarsHotSpring';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {Resource} from '../../../src/common/Resource';
import {SpaceType} from '../../../src/common/boards/SpaceType';

describe('MarsHotSpring', function() {
  let card: MarsHotSpring;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MarsHotSpring();
    [game, player] = testGame(2, {skipInitialShuffling: true});
  });

  it('canPlay 需要有相邻海洋的陆地', function() {
    expect(card.canPlay(player)).to.be.false;
    // 先放3个海洋，满足前置条件
    for (let i = 0; i < 3; i++) {
      const oceanSpace = game.board.spaces.find((s) => s.tile == null && s.spaceType === SpaceType.OCEAN);
      if (oceanSpace) game.addTile(player, oceanSpace, {tileType: TileType.OCEAN});
    }
    expect(card.canPlay(player)).to.be.true;
  });

  it('play 增加2热产出和2M产出，并放置温泉地块', function() {
    // 先放3个海洋，满足前置条件
    for (let i = 0; i < 3; i++) {
      const oceanSpace = game.board.spaces.find((s) => s.tile == null && s.spaceType === SpaceType.OCEAN);
      if (oceanSpace) game.addTile(player, oceanSpace, {tileType: TileType.OCEAN});
    }

    const heatBefore = player.production.get(Resource.HEAT);
    const mcBefore = player.production.get(Resource.MEGACREDITS);
    player.playCard(card);
    // 选择一个相邻海洋的陆地
    const available = game.board.getAvailableSpacesOnLand(player)
      .filter((space) => game.board.getAdjacentSpaces(space).some((adj) => adj.tile && adj.tile.tileType === TileType.OCEAN));
    const input = game.deferredActions.pop()?.execute();
    input!.cb(available[0]);
    // 检查产出
    expect(player.production.get(Resource.HEAT)).to.equal(heatBefore + 2);
    expect(player.production.get(Resource.MEGACREDITS)).to.equal(mcBefore + 2);
    // 检查温泉地块
    expect(available[0].tile).to.exist;
    expect(available[0].tile!.tileType).to.equal(TileType.HOT_SPRING);
  });
});
