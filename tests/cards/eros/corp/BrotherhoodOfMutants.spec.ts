import {expect} from 'chai';
import {BrotherhoodOfMutants} from '../../../../src/server/cards/eros/corp/BrotherhoodOfMutants';
import {testGame, runAllActions, cast} from '../../../TestingUtils';
import {TestPlayer} from '../../../TestPlayer';
import {IGame} from '../../../../src/server/IGame';
import {AndOptions} from '../../../../src/server/inputs/AndOptions';
import {OrOptions} from '../../../../src/server/inputs/OrOptions';

describe('BrotherhoodOfMutants', () => {
  let card: BrotherhoodOfMutants;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new BrotherhoodOfMutants();
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
  });

  it('行动：可选择抽牌或获得资源，数量等于影响力', () => {
    player.playCorporationCard(card);
    // 通过送一个代表到主导党模拟影响力为1
    const turmoil = game.turmoil!;
    const dominantParty = turmoil.dominantParty.name;
    turmoil.delegateReserve.add(player); // 先放到储备
    turmoil.sendDelegateToParty(player, dominantParty, game);
    card.action(player);
    runAllActions(game);
    // deferredAction: OrOptions
    const input = player.popWaitingFor() as OrOptions;
    expect(input).to.exist;
    // 选择抽牌
    input.options[0].cb();
    expect(player.cardsInHand.length).to.eq(1); // 影响力为1
    // 再次行动，选择资源
    card.action(player);
    runAllActions(game);
    const input2 = player.popWaitingFor() as OrOptions;
    input2.options[1].cb();
    runAllActions(game);
    const andOptions = cast(player.popWaitingFor(), AndOptions);
    // 分配1个资源到plants
    andOptions.options[3].cb(1); // plants
    andOptions.options[0].cb(0); // megacredits
    andOptions.options[1].cb(0); // steel
    andOptions.options[2].cb(0); // titanium
    andOptions.options[4].cb(0); // energy
    andOptions.options[5].cb(0); // heat
    andOptions.cb(undefined);
    runAllActions(game);
    expect(player.plants).to.eq(1);
  });

  it('政党扩展未启用时行动无效果', () => {
    [game, player] = testGame(1, {turmoilExtension: false, skipInitialShuffling: true});
    card = new BrotherhoodOfMutants();
    player.playCorporationCard(card);
    expect(card.action(player)).to.be.undefined;
    expect(player.cardsInHand.length).to.eq(0);
  });

  it('序列化/反序列化后isUsed应能恢复', () => {
    player.playCorporationCard(card);
    // 通过执行action触发isUsed变为true
    const turmoil = game.turmoil!;
    const dominantParty = turmoil.dominantParty.name;
    turmoil.delegateReserve.add(player);
    turmoil.sendDelegateToParty(player, dominantParty, game);
    const options = player.getActions();
    options.options.find((option) => option.title === 'Mutant and Proud (transform all neutral delegates to your delegates)')?.cb();

    expect(card.isUsed).to.be.true;
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(card.name)! as BrotherhoodOfMutants;
    expect(card2.isUsed).to.be.true;
  });
});
