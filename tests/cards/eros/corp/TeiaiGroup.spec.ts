import {expect} from 'chai';
import {TeiaiGroup} from '../../../../src/server/cards/eros/corp/TeiaiGroup';
import {testGame, runAllActions, cast} from '../../../TestingUtils';
import {TestPlayer} from '../../../TestPlayer';
import {IGame} from '../../../../src/server/IGame';
import {OlympusConference} from '../../../../src/server/cards/base/OlympusConference';
import {Mine} from '../../../../src/server/cards/base/Mine';
import {PowerPlant} from '../../../../src/server/cards/base/PowerPlant';
import {Sponsors} from '../../../../src/server/cards/base/Sponsors';
import {SelectAmount} from '../../../../src/server/inputs/SelectAmount';
import {CardName} from '../../../../src/common/cards/CardName';

describe('TeiaiGroup', () => {
  let card: TeiaiGroup;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TeiaiGroup();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.playCorporationCard(card);
  });


  it('无手牌时行动直接抽2牌', () => {
    player.cardsInHand = [];
    const input = card.action(player);
    expect(input).to.not.exist;
    expect(player.cardsInHand.length).to.eq(2);
  });

  it('有手牌时可弃X抽X-1，X不超过generation', () => {
    player.cardsInHand = [new OlympusConference(), new PowerPlant(), new Sponsors(), new Mine()];
    game.generation = 2;
    const input = card.action(player);
    expect(input).to.exist;
    const select = cast(input, SelectAmount);
    select.cb(2);
    runAllActions(game);
    // 弃2张，抽1张
    // 由于弃牌优先级更高，先弃后抽，完成DiscardCards行动
    // 选择弃掉奥林匹斯会议和发电厂
    const discardInput = player.popWaitingFor()!;
    expect(discardInput).to.exist;
    discardInput.cb([player.cardsInHand[0], player.cardsInHand[1]]); // 弃掉奥林匹斯会议和发电厂
    runAllActions(game);
    // 弃2张，抽1张，最终手牌数=4-2+1=3
    expect(player.cardsInHand.length).to.eq(3);
    expect(player.cardsInHand.map((c) => c.name)).to.include.members([CardName.SPONSORS, CardName.MINE]);
  });
});
