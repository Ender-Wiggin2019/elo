import {expect} from 'chai';
import {Protogen} from '../../../src/server/cards/commission/Protogen';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Penguins} from '../../../src/server/cards/promo/Penguins';
import {Psychrophiles} from '../../../src/server/cards/prelude/Psychrophiles';

describe('Protogen', () => {
  let card: Protogen;
  let player: TestPlayer;
  let game: IGame;
  let player2: TestPlayer;
  beforeEach(() => {
    card = new Protogen();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
  });

  it('初始资金为52', () => {
    expect(card.startingMegaCredits).to.eq(52);
  });

  // it('初始行动应抽取2张带微生物标志的牌', () => {
  //   player.playCorporationCard(card);

  //   // 验证初始行动
  //   player.defer(card.initialAction(player));
  //   runAllActions(game);

  //   // 检查抽取的牌
  //   expect(player.cardsInHand.length).to.eq(2);
  //   expect(player.cardsInHand[0].tags.includes(Tag.MICROBE)).to.be.true;
  //   expect(player.cardsInHand[1].tags.includes(Tag.MICROBE)).to.be.true;


  // });

  it('获得微生物资源时获得2热能', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始热能
    const initialHeat = player.heat;

    const mircard = new Psychrophiles;
    player.playCard(mircard);
    mircard.action(player);

    runAllActions(game);
    // 验证获得2热能
    expect(player.heat).to.eq(initialHeat + 2);
  });

  it('不应该为没有微生物资源类型的卡牌添加热能', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    const initialHeat = player.heat;


    const mircard = new Penguins;
    player.playCard(mircard);
    mircard.action(player);

    runAllActions(game);
    // 热能不应增加
    expect(player.heat).to.eq(initialHeat);
  });

  it('其他玩家获得微生物时我不该获得热能', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    const initialHeat = player.heat;

    // 其他玩家打出带微生物资源的牌
    const mircard = new Psychrophiles;
    player2.playCard(mircard);
    mircard.action(player2);

    runAllActions(game);
    // 验证我方热能未增加
    expect(player.heat).to.eq(initialHeat);
  });
});
