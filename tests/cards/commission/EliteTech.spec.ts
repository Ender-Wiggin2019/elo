import {expect} from 'chai';
import {EliteTech} from '../../../src/server/cards/commission/EliteTech';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {Research} from '../../../src/server/cards/base/Research';
import {Plantation} from '../../../src/server/cards/base/Plantation';
import {SpaceElevator} from '../../../src/server/cards/base/SpaceElevator';

describe('EliteTech', () => {
  let card: EliteTech;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new EliteTech();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
  });


  it('初始行动应抽1张带科学标签的卡牌', () => {
    // 执行初始行动
    player.playCorporationCard(card);
    player.defer(card.initialAction(player));

    runAllActions(game);

    expect(player.cardsInHand.length).to.equal(1);
    expect(player.cardsInHand[0].tags).to.include(Tag.SCIENCE);
  });

  it('当打出没有要求的卡牌时获得1MC', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始MC
    const initialMC = player.megaCredits;

    // 打出没有要求的卡牌
    player.playCard(new Research());
    runAllActions(game);

    // 验证获得了1MC
    expect(player.megaCredits).to.eq(initialMC + 1);

    // 打出另一张没有要求的卡牌
    const currentMC = player.megaCredits;
    player.playCard(new SpaceElevator());
    runAllActions(game);

    // 验证再次获得了1MC
    expect(player.megaCredits).to.eq(currentMC + 1);
  });

  it('当打出有要求的卡牌时不获得MC', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始MC
    const initialMC = player.megaCredits;

    // 打出有要求的卡牌
    // Plantation 有 requirements: {tag: Tag.SCIENCE, count: 2}
    player.playCard(new Plantation());
    runAllActions(game);

    // 验证没有获得额外MC
    expect(player.megaCredits).to.eq(initialMC);
  });

  it('当其他玩家打出卡牌时不触发效果', () => {
    // 玩家1打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录玩家1的初始金钱
    const initialMC = player.megaCredits;

    // 玩家2打出没有要求的卡牌
    player2.playCard(new Research());
    runAllActions(game);

    // 玩家2再打出一张没有要求的卡牌
    player2.playCard(new SpaceElevator());
    runAllActions(game);

    // 验证玩家1没有获得额外MC
    expect(player.megaCredits).to.eq(initialMC);
  });
});
