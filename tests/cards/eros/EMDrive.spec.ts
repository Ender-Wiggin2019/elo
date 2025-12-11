import {expect} from 'chai';
import {EMDrive} from '../../../src/server/cards/eros/EMDrive';
import {CardName} from '../../../src/common/cards/CardName';
import {cast, runAllActions, setRulingParty, testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Luna} from '../../../src/server/colonies/Luna';
import {Ganymede} from '../../../src/server/colonies/Ganymede';
import {Europa} from '../../../src/server/colonies/Europa';
import {IGame} from '../../../src/server/IGame';
import {SelectColony} from '../../../src/server/inputs/SelectColony';


describe('EMDrive', () => {
  let card: EMDrive;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new EMDrive();
    [game, player] = testGame(2, {turmoilExtension: true, coloniesExtension: true, skipInitialShuffling: true});
    // 设置3个真实殖民地
    game.colonies = [new Luna(), new Ganymede(), new Europa()];
  });


  it('should not be playable if Scientists不执政', () => {
    setRulingParty(game, PartyName.MARS);
    expect(card.canPlay(player)).to.be.false;
    setRulingParty(game, PartyName.UNITY);
    expect(card.canPlay(player)).to.be.false;
  });

  it('should be playable if Scientists执政', () => {
    setRulingParty(game, PartyName.SCIENTISTS);
    expect(card.canPlay(player)).to.be.true;
  });

  it('should play and have 2分', () => {
    setRulingParty(game, PartyName.SCIENTISTS);
    player.playCard(card);
    expect(player.playedCards.get(CardName.EM_DRIVE)).to.exist;
    expect(player.getVictoryPoints().victoryPoints).to.eq(2);
  });

  it('should increase a colony track to max when action, and require colony可提升', () => {
    setRulingParty(game, PartyName.SCIENTISTS);
    player.playCard(card);
    // 设定 Luna 轨道为3，Ganymede为6（已满），Europa为2
    game.colonies[0].trackPosition = 3;
    game.colonies[1].trackPosition = 6;
    game.colonies[2].trackPosition = 2;
    // 行动应弹出可选殖民地（Luna/Europa）
    card.action(player);
    expect(game.deferredActions.length).to.eq(1);
    const selectColony = cast(game.deferredActions.pop()!.execute(), SelectColony);
    expect(selectColony.colonies.map((c: any) => c.name)).to.include.members([game.colonies[0].name, game.colonies[2].name]);
    // 选择 Luna
    selectColony.cb(game.colonies[0]);
    expect(game.colonies[0].trackPosition).to.eq(6);
    // 选择 Europa
    game.colonies[2].trackPosition = 2;
    cast(card.action(player), undefined);
    const selectColony2 = cast(game.deferredActions.pop()!.execute(), SelectColony);
    selectColony2.cb(game.colonies[2]);
    expect(game.colonies[2].trackPosition).to.eq(6);
  });

  it('should not act if no colony can be increased', () => {
    setRulingParty(game, PartyName.SCIENTISTS);
    player.playCard(card);
    game.colonies.forEach((c) => c.trackPosition = 6);
    expect(card.action(player)).to.be.undefined;
  });

  it('should persist after serialization/deserialization', () => {
    setRulingParty(game, PartyName.SCIENTISTS);
    player.playCard(card);
    game.colonies[0].trackPosition = 3;
    card.action(player);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(CardName.EM_DRIVE) as EMDrive;
    expect(player2.getVictoryPoints().victoryPoints).to.eq(2);
    // 行动依然可用
    player.popWaitingFor.call(player2);
    player2.game.colonies[0].trackPosition = 2;
    card2.action(player2);
    runAllActions(game2);
    expect(player2.getWaitingFor()).not.to.be.undefined;
  });
});
