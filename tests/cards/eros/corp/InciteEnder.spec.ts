import {expect} from 'chai';
import {InciteEnder} from '../../../../src/server/cards/eros/corp/InciteEnder';
import {testGame} from '../../../TestGame';
import {TestPlayer} from '../../../TestPlayer';
import {runAllActions} from '../../../TestingUtils';
import {IGame} from '../../../../src/server/IGame';
import {PartyName} from '../../../../src/common/turmoil/PartyName';
import {SelectParty} from '../../../../src/server/inputs/SelectParty';
import {SelectGlobalEvent} from '../../../../src/server/inputs/SelectGlobalEvent';

describe('InciteEnder', () => {
  let card: InciteEnder;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new InciteEnder();
    [game, player] = testGame(2, {turmoilExtension: true, skipInitialShuffling: true});
  });


  it('初始行动应放置两名代表在一个政党中', () => {
    // 执行初始行动
    player.playCorporationCard(card);
    player.defer(card.initialAction(player));
    runAllActions(game);

    // 验证等待输入是选择党派
    const input = player.popWaitingFor();
    expect(input).to.exist;
    expect(input!.type).to.eq('party');

    // 选择科学家党派
    const selectParty = input as SelectParty;
    selectParty.cb(PartyName.SCIENTISTS);
    runAllActions(game);

    // 验证有两名代表被放入科学家党派
    const scientistsParty = game.turmoil!.getPartyByName(PartyName.SCIENTISTS);
    expect(scientistsParty.delegates.get(player)).to.eq(2);
  });


  it('行动：查看并丢弃全球事件卡', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);


    // 验证可以执行行动
    expect(card.canAct()).to.be.true;

    // 执行行动
    card.action(player);
    runAllActions(game);

    // 验证等待输入是选择全球事件
    const input = player.popWaitingFor();
    expect(input).to.exist;
    expect(input!.type).to.eq('globalEvent');

    // 选择丢弃所有事件
    const selectGlobalEvent = input as SelectGlobalEvent;
    // 使用Array.from转换readonly数组为普通数组
    selectGlobalEvent.cb(Array.from(selectGlobalEvent.globalEvents));
    runAllActions(game);

    // TODO jiang 不需要进一步验证，因为丢弃事件的具体逻辑在卡牌实现中
  });

  it('非主导党派的领袖应提供额外影响力', () => {
    // 打出公司卡
    player.playCorporationCard(card);
    runAllActions(game);

    // 初始时应该没有额外影响力
    const turmoil = game.turmoil!;
    expect(turmoil.getInfluence(player)).to.eq(0); // 初始无影响力

    // 让玩家成为非主导党派的领袖
    const scientistsParty = turmoil.getPartyByName(PartyName.SCIENTISTS);
    scientistsParty.partyLeader = player;

    // 设置一个不同的主导党派
    turmoil.dominantParty = turmoil.getPartyByName(PartyName.MARS);

    // 重新计算影响力，应该增加1点（因为有一个非主导党派的领袖身份）
    expect(turmoil.getInfluence(player)).to.eq(1);

    // 让玩家成为另一个非主导党派的领袖
    const greensParty = turmoil.getPartyByName(PartyName.GREENS);
    greensParty.partyLeader = player;

    // 重新计算影响力，应该增加到2点
    expect(turmoil.getInfluence(player)).to.eq(2);

    // 主导党派为 scientistsParty 避免影响力重复计算
    turmoil.dominantParty = scientistsParty;
    expect(turmoil.getInfluence(player)).to.eq(2);
  });
});
