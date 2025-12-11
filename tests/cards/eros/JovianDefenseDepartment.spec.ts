import {expect} from 'chai';
import {JovianDefenseDepartment} from '../../../src/server/cards/eros/JovianDefenseDepartment';
import {CardName} from '../../../src/common/cards/CardName';
import {testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {SaturnSystems} from '../../../src/server/cards/corporation/SaturnSystems';
import {IoMiningIndustries} from '../../../src/server/cards/base/IoMiningIndustries';
import {TerraformingGanymede} from '../../../src/server/cards/base/TerraformingGanymede';
import {JovianEmbassy} from '../../../src/server/cards/promo/JovianEmbassy';
import {PowerPlant} from '../../../src/server/cards/base/PowerPlant';

describe('JovianDefenseDepartment', () => {
  let card: JovianDefenseDepartment;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new JovianDefenseDepartment();
    [game, player] = testGame(1, {skipInitialShuffling: true});
  });


  it('should play and get 1 asteroid, 1 point', () => {
    player.playCard(card);
    expect(player.playedCards.get(CardName.JOVIAN_DEFENSE_DEPARTMENT)).to.exist;
    expect(card.resourceCount).to.eq(1);
    expect(player.getVictoryPoints().victoryPoints).to.eq(1);
  });

  it('should gain asteroid when playing another Jovian card', () => {
    player.playCard(card);
    const jovianCard = new SaturnSystems();
    player.playCard(jovianCard);
    expect(card.resourceCount).to.eq(2);
    expect(player.getVictoryPoints().victoryPoints).to.eq(2);
  });

  it('should gain correct asteroid for multi-tag Jovian card', () => {
    player.playCard(card);
    // TerraformingGanymede 有1个Jovian tag，JovianEmbassy有1个Jovian tag，IoMiningIndustries有1个Jovian tag
    player.playCard(new TerraformingGanymede());
    expect(card.resourceCount).to.eq(2);
    player.playCard(new JovianEmbassy());
    expect(card.resourceCount).to.eq(3);
    player.playCard(new IoMiningIndustries());
    expect(card.resourceCount).to.eq(4);
    expect(card.getVictoryPoints(player)).to.eq(4);
  });

  it('should not gain asteroid for non-Jovian card', () => {
    player.playCard(card);
    // 用无Jovian tag的真实卡牌
    const nonJovian = new PowerPlant();
    player.playCard(nonJovian);
    expect(card.resourceCount).to.eq(1);
    expect(player.getVictoryPoints().victoryPoints).to.eq(1);
  });

  it('should persist after serialization/deserialization', () => {
    player.playCard(card);
    player.playCard(new SaturnSystems());
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    const card2 = player2.playedCards.get(CardName.JOVIAN_DEFENSE_DEPARTMENT)!;
    expect(card2).to.exist;
    expect(card2.resourceCount).to.eq(2);
    expect(player2.getVictoryPoints().victoryPoints).to.eq(2);
  });
});
