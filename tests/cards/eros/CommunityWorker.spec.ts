import {expect} from 'chai';
import {CommunityWorker} from '../../../src/server/cards/eros/CommunityWorker';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Lichen} from '../../../src/server/cards/base/Lichen';
import {DustSeals} from '../../../src/server/cards/base/DustSeals';
import {MineralDeposit} from '../../../src/server/cards/base/MineralDeposit';

describe('CommunityWorker', () => {
  let card: CommunityWorker;
  let player: TestPlayer;
  let game: import('../../../src/server/IGame').IGame;

  beforeEach(() => {
    card = new CommunityWorker();
    [game, player] = testGame(1, {skipInitialShuffling: true});
  });

  it('should gain 4M€ when played itself', () => {
    player.megaCredits = 0;
    player.playCard(card);
    expect(player.megaCredits).to.eq(4);
  });

  it('should gain 4M€ when playing another no-tag card (DustSeals)', () => {
    player.megaCredits = 0;
    player.playedCards.push(card);
    const noTagCard = new DustSeals();
    player.playCard(noTagCard);
    expect(player.megaCredits).to.eq(4);
  });

  it('should NOT gain 4M€ when playing a card with tags (Lichen)', () => {
    player.megaCredits = 0;
    player.playedCards.push(card);
    const plantCard = new Lichen();
    player.playCard(plantCard);
    expect(player.megaCredits).to.eq(0);
  });

  it('should NOT gain 4M€ when playing an event card with no tags (MineralDeposit)', () => {
    player.megaCredits = 0;
    player.playedCards.push(card);
    const eventNoTagCard = new MineralDeposit();
    player.playCard(eventNoTagCard);
    expect(player.megaCredits).to.eq(0);
  });

  it('should persist after serialization/deserialization', () => {
    player.megaCredits = 0;
    player.playCard(card);
    expect(player.megaCredits).to.eq(4);
    const data = game.serialize();
    const game2 = game.loadFromJSON(data);
    const player2 = game2.players[0];
    // 再打出一张无标签卡
    const noTagCard = new DustSeals();
    const megaCredits = player2.megaCredits;
    player2.playCard(noTagCard);
    expect(player2.megaCredits).to.eq(megaCredits + 4);
  });
});
