import {expect} from 'chai';
import {Phase} from '../../src/common/Phase';
import {CardType} from '../../src/common/cards/CardType';
import {ICard} from '../../src/server/cards/ICard';
import {EcoLine} from '../../src/server/cards/corporation/EcoLine';
import {Karen} from '../../src/server/cards/ceos/Karen';
import {Loan} from '../../src/server/cards/prelude/Loan';
import {Birds} from '../../src/server/cards/base/Birds';
import {collectStats} from '../../src/server/stats/collectStats';
import {testGame} from '../TestGame';

describe('collectStats', () => {
  it('skips games that have not reached the END phase', () => {
    const [game] = testGame(1);

    expect(collectStats(game)).to.equal(undefined);
  });

  it('captures the complete multiplayer roster, ranking, score parts, and normalized ids', () => {
    const [game, player, opponent] = testGame(2, {rankOption: true});
    const endedAt = Date.parse('2026-10-08T15:16:17.000Z');
    game.phase = Phase.END;
    game.generation = 3;
    player.userId = 'u123456789012345-private-token';
    player.terraformRating = 25;
    opponent.terraformRating = 20;

    const fact = collectStats(game, endedAt);

    expect(fact).to.not.equal(undefined);
    expect(fact).to.deep.include({
      gameId: 'game-id',
      endedAt,
      day: '2026-10-08',
      players: 2,
      generations: 3,
      ranked: true,
      cardsComplete: true,
    });
    expect(fact?.seats).to.have.length(2);
    expect(fact?.seats[0]).to.include({
      seat: 0,
      accountId: 'u123456789012',
      score: 25,
      position: 1,
      won: true,
    });
    expect(fact?.seats[0].scoreParts).to.deep.equal({
      tr: 25,
      cards: 0,
      greenery: 0,
      city: 0,
      milestones: 0,
      awards: 0,
      other: 0,
    });
    expect(fact?.seats[1]).to.include({
      seat: 1,
      accountId: null,
      score: 20,
      position: 2,
      won: false,
    });
  });

  it('marks an unsuccessful solo game as a loss despite its first place position', () => {
    const [game, player] = testGame(1);
    game.phase = Phase.END;
    player.terraformRating = 20;

    const fact = collectStats(game, Date.parse('2026-10-08T00:00:00.000Z'));

    expect(fact?.players).to.equal(1);
    expect(fact?.seats[0]).to.include({
      position: 1,
      won: false,
    });
  });

  it('deduplicates cards in the final tableau and classifies supported card types', () => {
    const [game, player] = testGame(1);
    game.phase = Phase.END;
    const corporation = new EcoLine();
    const prelude = new Loan();
    const project = new Birds();
    const ceo = new Karen();
    player.playedCards.push(corporation, prelude, project, ceo);
    // Bypass PlayedCards' index intentionally to model a malformed duplicate
    // array entry; the collector must still persist each final card once.
    (player.playedCards.asArray() as Array<ICard>).push(project);

    const fact = collectStats(game, Date.parse('2026-10-08T00:00:00.000Z'));
    const cards = fact?.seats[0].cards ?? [];

    expect(cards).to.have.length(4);
    expect(cards.map((card) => card.type)).to.deep.equal([
      'corporation',
      'prelude',
      'project',
      'ceo',
    ]);
    expect(cards.every((card) => Number.isFinite(card.vp))).to.equal(true);
    expect(new Set(cards.map((card) => card.name)).size).to.equal(cards.length);
    expect(cards.map((card) => card.type)).to.not.include(CardType.STANDARD_PROJECT);
  });
});
