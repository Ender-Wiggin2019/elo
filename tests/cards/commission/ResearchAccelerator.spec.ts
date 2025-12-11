import {expect} from 'chai';
import {ResearchAccelerator} from '../../../src/server/cards/commission/ResearchAccelerator';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Tag} from '../../../src/common/cards/Tag';
import {Research} from '../../../src/server/cards/base/Research';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';
import {FusionPower} from '../../../src/server/cards/base/FusionPower';

describe('ResearchAccelerator', () => {
  let card: ResearchAccelerator;
  let player: TestPlayer;
  // let game: IGame;

  beforeEach(() => {
    card = new ResearchAccelerator();
    const [_game, _player] = testGame(2, {skipInitialShuffling: true});
    player = _player;
  });

  it('前置条件要求3个科学标志', () => {
    // 没有科学标签，不能打出
    expect(card.canPlay(player)).is.false;

    // 添加1个科学标签（SearchForLife有1个科学标签）
    player.playedCards.push(new SearchForLife());
    expect(card.canPlay(player)).is.false;

    // 添加2个科学标签（Research有2个科学标签）
    player.playedCards.push(new Research());
    // 现在总共有3个科学标签，可以打出
    expect(card.canPlay(player)).is.true;
  });

  it('打出卡牌后提供2个通用标志', () => {
    // 添加足够的科学标签以打出卡牌
    player.playedCards.push(new SearchForLife()); // 1个科学标签
    player.playedCards.push(new Research()); // 2个科学标签，总共3个

    player.playCard(card);

    // 测试与其他卡牌要求的交互
    const geneRepairCard = new FusionPower(); // 需要2个电标志
    expect(player.tags.count(Tag.SCIENCE)).eq(5);
    expect(player.tags.count(Tag.WILD)).eq(2);
    expect(geneRepairCard.canPlay(player)).is.true;
  });
});
