import {expect} from 'chai';
import {StarlinkDrifter} from '../../../src/server/cards/commission/StarlinkDrifter';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {Tag} from '../../../src/common/cards/Tag';
import {PowerPlant} from '../../../src/server/cards/base/PowerPlant';
import {ImportedGHG} from '../../../src/server/cards/base/ImportedGHG';
import {AcquiredCompany} from '../../../src/server/cards/base/AcquiredCompany';
import {DustSeals} from '../../../src/server/cards/base/DustSeals';
import {ResearchCoordination} from '../../../src/server/cards/prelude/ResearchCoordination';
import {FueledGenerators} from '../../../src/server/cards/base/FueledGenerators';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';
import {AdvancedAlloys} from '../../../src/server/cards/base/AdvancedAlloys';
import {Cartel} from '../../../src/server/cards/base/Cartel';
import {MicroMills} from '../../../src/server/cards/base/MicroMills';
import {ResearchAccelerator} from '../../../src/server/cards/commission/ResearchAccelerator';
import {Research} from '../../../src/server/cards/base/Research';
import {CallistoPenalMines} from '../../../src/server/cards/base/CallistoPenalMines';
import {OlympusConference} from '../../../src/server/cards/base/OlympusConference';

describe('StarlinkDrifter', () => {
  let card: StarlinkDrifter;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new StarlinkDrifter();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });


  it('打出标记相同的卡牌应摸一张卡', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    expect(card.tags).to.deep.eq([Tag.WILD]);

    // 记录初始手牌数
    const initialHandSize = player.cardsInHand.length;

    // 打出第一张牌(有science标记)
    player.playCard(new SearchForLife());
    runAllActions(game);

    // 第一张牌触发效果
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);
    expect(card.data.count).to.eq(1);

    // 打出第二张相同标记的牌(science标记)
    player.playCard(new AdvancedAlloys());
    runAllActions(game);

    // 验证摸了一张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize + 2);
    expect(card.data.count).to.eq(2);

    // 打出第三张不同标记的牌(power标记)
    player.playCard(new PowerPlant());
    runAllActions(game);

    // 不应触发效果
    expect(player.cardsInHand.length).to.eq(initialHandSize + 2);
    expect(card.data.count).to.eq(2);

    // 打出另一张相同标记的牌(power标记)
    player.playCard(new FueledGenerators());
    runAllActions(game);

    // 验证摸了一张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize + 3);
    expect(card.data.count).to.eq(3);
  });

  it('打出事件卡不应计入标记比较', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize = player.cardsInHand.length;

    // 打出一张正常牌(earth标记)
    player.playCard(new AcquiredCompany());
    runAllActions(game);


    // 验证摸了一张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);
    expect(card.data.count).to.eq(1);

    // 打出一张事件卡(有space标记)
    const importedGHG = new ImportedGHG();
    player.playCard(importedGHG);
    runAllActions(game);

    // 事件卡不应被计入标记比较
    // 再打出earth标记牌时，比较的是第一张非事件卡
    player.playCard(new Cartel());
    runAllActions(game);

    // 验证摸了一张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);
    expect(card.data.count).to.eq(1);
  });

  it('无标记卡效果测试', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize = player.cardsInHand.length;


    // 打出第一张无标记卡
    player.playCard( new DustSeals());
    runAllActions(game);

    // 验证摸了一张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);
    expect(card.data.count).to.eq(1);

    // 打出第二张无标记卡
    player.playCard(new MicroMills());
    runAllActions(game);

    // 验证摸了一张牌
    expect(player.cardsInHand.length).to.eq(initialHandSize + 2);
    expect(card.data.count).to.eq(2);
  });

  it('wild标记测试', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize = player.cardsInHand.length;

    player.playCard(new ResearchCoordination());
    runAllActions(game);


    // 由于公司卡有wild标记，接一张单标记卡也应该触发效果
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);
    expect(card.data.count).to.eq(1);

    // 打出一张单标记卡
    player.playCard(new SearchForLife());
    runAllActions(game);

    // 由于上一张卡有wild标记，接一张单标记卡也应该触发效果
    expect(player.cardsInHand.length).to.eq(initialHandSize + 2);
    expect(card.data.count).to.eq(2);
  });

  it('ResearchAccelerator提供的多个wild标记测试', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 添加足够科学标签以打出ResearchAccelerator
    player.playedCards.push(new SearchForLife()); // 1个科学标签
    player.playedCards.push(new Research()); // 2个科学标签，总共3个


    // 第一段 打出ResearchAccelerator（有2个wild标签）
    player.playCard(new ResearchAccelerator());
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize = player.cardsInHand.length;
    const initialCardCount = card.data.count;

    // 打出无标签卡
    player.playCard(new DustSeals());
    runAllActions(game);

    // 应触发摸牌效果（2个wild标签接无标签卡）
    expect(player.cardsInHand.length).to.eq(initialHandSize + 1);
    expect(card.data.count).to.eq(initialCardCount + 1);


    // 第二段
    player.playedCards.remove(new ResearchAccelerator());
    player.playCard(new ResearchAccelerator());
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize2 = player.cardsInHand.length;
    const initialCardCount2 = card.data.count;

    // 打出1个标签卡
    player.playCard(new MicroMills());
    runAllActions(game);

    // 应触发摸牌效果（2wild标签卡接1个标签卡）
    expect(player.cardsInHand.length).to.eq(initialHandSize2 + 1);
    expect(card.data.count).to.eq(initialCardCount2 + 1);


    // 第三段
    player.playedCards.remove(new ResearchAccelerator());
    player.playCard(new ResearchAccelerator());
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize3 = player.cardsInHand.length;
    const initialCardCount3 = card.data.count;

    // 打出2个标签卡
    player.playCard(new CallistoPenalMines()); // 木星钛
    runAllActions(game);

    // 不应触发摸牌效果（1个标签卡接2个标签卡）
    expect(player.cardsInHand.length).to.eq(initialHandSize3 + 1);
    expect(card.data.count).to.eq(initialCardCount3 + 1);


    // 第四段
    player.playedCards.remove(new ResearchAccelerator());
    player.playCard(new ResearchAccelerator());
    runAllActions(game);

    // 记录初始手牌数
    const initialHandSize4 = player.cardsInHand.length;
    const initialCardCount4 = card.data.count;

    // 打出3个标签卡
    player.playCard(new OlympusConference()); // 地球+钢铁+科学
    runAllActions(game);

    // 不应触发摸牌效果（2个标签卡接3个标签卡）
    expect(player.cardsInHand.length).to.eq(initialHandSize4 + 0);
    expect(card.data.count).to.eq(initialCardCount4 + 0);
  });

  it('游戏状态测试', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 添加一些数据
    player.playCard(new FueledGenerators()); // POWER +  BUILDING
    runAllActions(game);
    player.playCard(new PowerPlant()); // // POWER +  BUILDING
    runAllActions(game);

    // 验证游戏状态
    expect(card.data.count).to.eq(1);
    expect(card.data.tags.length).to.eq(2);
    expect(card.data.tags).to.deep.eq([Tag.POWER, Tag.BUILDING]);
  });
});
