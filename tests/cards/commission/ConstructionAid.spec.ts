import {expect} from 'chai';
import {ConstructionAid} from '../../../src/server/cards/commission/ConstructionAid';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {Tag} from '../../../src/common/cards/Tag';
import {Research} from '../../../src/server/cards/base/Research';
import {Mine} from '../../../src/server/cards/base/Mine';
import {CheungShingMARS} from '../../../src/server/cards/prelude/CheungShingMARS';

describe('ConstructionAid', () => {
  let card: ConstructionAid;
  let player: TestPlayer;
  // let game: IGame;

  beforeEach(() => {
    card = new ConstructionAid();
    const [_game, _player] = testGame(1, {skipInitialShuffling: true});
    player = _player;
    player.megaCredits = 100;
  });

  it('初始费用为12 M€，1VP，1铁标', () => {
    expect(card.cost).to.eq(12);
    expect(card.victoryPoints).to.eq(1);
    expect(card.tags).deep.eq([Tag.BUILDING]);
  });

  it('对带有建筑标志的卡牌提供2M€折扣', () => {
    // 建筑标志卡牌
    const buildingCard = new Mine();
    expect(buildingCard.tags).to.include(Tag.BUILDING);

    // 没有建筑标志的卡牌
    const nonBuildingCard = new Research();
    expect(nonBuildingCard.tags).to.not.include(Tag.BUILDING);

    // 测试折扣效果
    player.playCard(card);

    // 建筑卡应该有2M€折扣
    expect(player.getCardCost( buildingCard)).to.eq(buildingCard.cost-2);

    // 非建筑卡应该没有折扣
    expect(player.getCardCost(nonBuildingCard)).to.eq(nonBuildingCard.cost);
  });

  it('折扣可以累加', () => {
    player.playCard(card);
    player.playCorporationCard(new CheungShingMARS);

    // 建筑卡
    const buildingCard = new Mine();

    // 应该获得4M€折扣(2+2)
    const discount = player.getCardCost(buildingCard);
    expect(discount).to.eq(buildingCard.cost - 4);
  });
});
