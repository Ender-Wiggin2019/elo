import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {Asteroid} from '../../../src/server/cards/base/Asteroid';
import {BigAsteroid} from '../../../src/server/cards/base/BigAsteroid';
import {Comet} from '../../../src/server/cards/base/Comet';
import {DustSeals} from '../../../src/server/cards/base/DustSeals';
import {GiantIceAsteroid} from '../../../src/server/cards/base/GiantIceAsteroid';
import {LavaFlows} from '../../../src/server/cards/base/LavaFlows';
import {ResearchOutpost} from '../../../src/server/cards/base/ResearchOutpost';
import {ScienceTagCard} from '../../../src/server/cards/community/ScienceTagCard';
import {ResearchCoordination} from '../../../src/server/cards/prelude/ResearchCoordination';
import {OrbitalMissiles} from '../../../src/server/cards/commission/OrbitalMissiles';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {cast, fakeCard} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('OrbitalMissiles', () => {
  it('has the commissioned active card properties', () => {
    const card = new OrbitalMissiles();

    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.cost).to.eq(23);
    expect(card.tags).to.deep.eq([Tag.MARS, Tag.SPACE]);
    expect(card.victoryPoints).to.eq(1);
    expect(card.resourceType).to.eq(CardResource.FIGHTER);
  });

  it('requires five actual event cards, even with a wild tag', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player] = testGame(1);
    player.megaCredits = 100;

    player.playedCards.push(new ResearchCoordination());
    const events = [
      new Asteroid(),
      new Comet(),
      new BigAsteroid(),
      new GiantIceAsteroid(),
      new LavaFlows(),
    ];

    expect(player.getPlayedEventsCount()).to.eq(0);
    expect(card.canPlay(player)).to.be.false;

    player.playedCards.push(...events.slice(0, 4));
    expect(player.getPlayedEventsCount()).to.eq(4);
    expect(card.canPlay(player)).to.be.false;

    player.playedCards.push(events[4]);
    expect(player.getPlayedEventsCount()).to.eq(5);
    expect(card.canPlay(player)).to.be.true;
  });

  it('gains two fighters when it is played, including its Mars and Space tags', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player] = testGame(1);

    player.playCard(card);

    expect(card.resourceCount).to.eq(2);
  });

  it('counts printed tags without adding an event tag, and excludes the science proxy', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    card.onCardPlayed(player, new DustSeals());
    card.onCardPlayed(player, new ResearchOutpost());
    card.onCardPlayed(player, new LavaFlows());
    card.onCardPlayed(player, new Asteroid());
    card.onCardPlayed(player, fakeCard({type: CardType.EVENT, tags: [Tag.EVENT, Tag.SPACE]}));
    card.onCardPlayed(player, new ScienceTagCard());

    expect(card.resourceCount).to.eq(5);
  });

  it('does not trigger from a card played by another player', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player, opponent] = testGame(2);
    player.playedCards.push(card);

    opponent.onCardPlayed(new Asteroid());

    expect(card.resourceCount).to.eq(0);
  });

  it('can act only when fighters are available', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    expect(card.canAct()).to.be.false;
    card.resourceCount = 1;
    expect(card.canAct()).to.be.true;
  });

  it('converts a selected number of fighters to M€ and leaves the remainder', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);
    card.resourceCount = 5;

    const selectAmount = cast(card.action(player), SelectAmount);
    selectAmount.process({type: 'amount', amount: 2});

    expect(card.resourceCount).to.eq(3);
    expect(player.stock.get(Resource.MEGACREDITS)).to.eq(2);
  });

  it('rejects an amount above the available fighters', () => {
    const card = new OrbitalMissiles();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);
    card.resourceCount = 3;

    const selectAmount = cast(card.action(player), SelectAmount);
    expect(() => selectAmount.process({type: 'amount', amount: 4})).to.throw(Error, /too high/);
    expect(card.resourceCount).to.eq(3);
    expect(player.stock.get(Resource.MEGACREDITS)).to.eq(0);
  });
});
