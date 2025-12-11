import {expect} from 'chai';
import {Thermopoli} from '../../../src/server/cards/commission/Thermopoli';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectParty} from '../../../src/server/inputs/SelectParty';

describe('Thermopoli', () => {
  let card: Thermopoli;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Thermopoli();
    [game, player] = testGame(2, {turmoilExtension: true, skipInitialShuffling: true});
  });


  it('初始行动应放置两名代表在一个政党中', () => {
    // 打出公司卡并触发初始行动
    player.playCorporationCard(card);
    player.defer(card.initialAction(player));
    runAllActions(game);

    // 验证等待输入是选择政党
    const input = player.popWaitingFor();
    expect(input).to.exist;
    expect(input!.type).to.eq('party');

    // 选择科学家党派
    const selectParty = input as SelectParty;
    selectParty.cb(PartyName.SCIENTISTS);
    runAllActions(game);

    // 验证科学家党派中有2名玩家代表
    const scientistsParty = game.turmoil!.getPartyByName(PartyName.SCIENTISTS);
    expect(scientistsParty.delegates.get(player)).to.eq(2);
  });

  it('卡牌提供额外影响力', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 派送一名代表到主导党派
    const dominantParty = game.turmoil!.dominantParty;
    game.turmoil!.sendDelegateToParty(player, dominantParty.name, game);
    runAllActions(game);

    // 现在应有2点影响力（1点来自代表，1点来自卡牌效果）
    expect(game.turmoil!.getInfluence(player)).to.eq(2);
  });

  it('行动：每点影响力获得2点热量', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);


    // 派送一名代表到主导党派
    const dominantParty = game.turmoil!.dominantParty;
    game.turmoil!.sendDelegateToParty(player, dominantParty.name, game);
    runAllActions(game);

    expect(game.turmoil!.getInfluence(player)).to.eq(2);
    // 记录初始热量
    const initialHeat = player.heat;

    // 验证行动始终可用
    expect(card.canAct()).to.be.true;

    // 执行行动
    card.action(player);
    runAllActions(game);

    // 验证获得的热量 = 影响力 * 2
    expect(player.heat).to.eq(initialHeat + 4); // 2点影响力 * 2 = 4点热量

    // 发送更多代表来增加影响力
    game.turmoil!.sendDelegateToParty(player, dominantParty.name, game);
    game.turmoil!.sendDelegateToParty(player, dominantParty.name, game);
    game.turmoil!.sendDelegateToParty(player, dominantParty.name, game);
    runAllActions(game);

    // 现在应该有3点影响力（2点来自在两个党派有代表，1点来自卡牌效果）
    expect(game.turmoil!.getInfluence(player)).to.eq(3);

    // 记录当前热量
    const currentHeat = player.heat;

    // 再次执行行动
    card.action(player);
    runAllActions(game);

    // 验证新获得的热量 = 新影响力 * 2
    expect(player.heat).to.eq(currentHeat + 6); // 3点影响力 * 2 = 6点热量
  });
});
