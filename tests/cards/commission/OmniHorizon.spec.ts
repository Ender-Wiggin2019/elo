import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {CardName} from '../../../src/common/cards/CardName';
import {Player} from '../../../src/server/Player';
import {Payment} from '../../../src/common/inputs/Payment';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectPayment} from '../../../src/server/inputs/SelectPayment';
import {AndOptions} from '../../../src/server/inputs/AndOptions';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {SearchForLife} from '../../../src/server/cards/base/SearchForLife';
import {Helion} from '../../../src/server/cards/corporation/Helion';
import {StormCraftIncorporated} from '../../../src/server/cards/colonies/StormCraftIncorporated';
import {OmniHorizon} from '../../../src/server/cards/commission/OmniHorizon';
import {deserializeCorporationCard, serializeCorporationCard} from '../../../src/server/cards/CardSerialization';
import {cast, fakeCard, formatMessage, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('OmniHorizon', () => {
  it('has the commissioned corporation properties', () => {
    const card = new OmniHorizon();

    expect(card.type).eq(CardType.CORPORATION);
    expect(card.tags).deep.eq([]);
    expect(card.startingMegaCredits).eq(47);
    expect(card.metadata.cardNumber).eq('XB92');
  });

  it('gives 3 M€ once for each new non-event, non-wild tag', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new OmniHorizon();
    player.playCorporationCard(card);
    player.megaCredits = 0;

    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    player.playCard(fakeCard({tags: [Tag.SCIENCE, Tag.WILD]}));
    player.playCard(fakeCard({type: CardType.EVENT, tags: [Tag.EVENT, Tag.SPACE]}));
    player.playCard(fakeCard({tags: [Tag.SPACE]}));

    expect(card.allTags).deep.eq(new Set([Tag.SCIENCE, Tag.SPACE]));
    expect(player.megaCredits).eq(6);
    expect(game.gameLog.map(formatMessage).filter((message) => message.includes('gained 3 M€'))).has.length(2);
  });

  it('does not reward tag types already in play when acquired mid-game', () => {
    const [/* game */, player] = testGame(1, {skipInitialShuffling: true});
    player.playedCards.push(new SearchForLife());
    const card = new OmniHorizon();
    player.megaCredits = 0;

    player.playCorporationCard(card);
    expect(card.allTags).contains(Tag.SCIENCE);
    expect(player.megaCredits).eq(0);

    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    expect(player.megaCredits).eq(0);
  });

  it('offers an unfiltered card draw at each multiple of five tags', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new OmniHorizon();
    player.playedCards.push(card);
    card.allTags.add(Tag.SCIENCE);
    player.megaCredits = 10;
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE]}));

    const handBefore = player.cardsInHand.length;
    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game);

    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(game);

    expect(player.cardsInHand).has.length(handBefore + 1);
    expect(player.megaCredits).eq(7);
    expect(game.gameLog.map(formatMessage).filter((message) => message.includes(`lost 3 M€ because of ${card.name}`))).has.length(1);
  });

  it('remembers existing non-card tags when acquired mid-game', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    player.tags.extraScienceTags = 1;
    const card = new OmniHorizon();
    player.playCorporationCard(card);
    player.megaCredits = 0;
    player.tags.extraScienceTags++;
    player.triggerOnNonCardTagAdded(Tag.SCIENCE);
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(card.allTags.has(Tag.SCIENCE)).is.true;
  });

  for (const includeEvents of [false, true]) {
    it(`counts five tableau tags independently of event tags (Odyssey: ${includeEvents})`, () => {
      const [game, player] = testGame(1, {skipInitialShuffling: true});
      if (includeEvents) {
        player.playedCards.push(fakeCard({name: CardName.ODYSSEY}));
      }
      player.playedCards.push(fakeCard({type: CardType.EVENT, tags: Array(4).fill(Tag.SCIENCE)}));
      player.playedCards.push(fakeCard({tags: Array(4).fill(Tag.SCIENCE)}));
      const card = new OmniHorizon();
      player.playCorporationCard(card);
      player.megaCredits = 3;
      player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
      runAllActions(game);
      cast(player.popWaitingFor(), OrOptions).options[0].cb();
      runAllActions(game);
      expect(player.cardsInHand).has.length(1);
      expect(player.megaCredits).eq(0);
      expect(card.data.counts[Tag.SCIENCE]).eq(5);
    });
  }

  it('waits for and logs heat used as the draw payment', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new OmniHorizon();
    player.playedCards.push(card);
    card.allTags.add(Tag.SCIENCE);
    player.megaCredits = 0;
    player.canUseHeatAsMegaCredits = true;
    player.heat = 3;
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE]}));

    const handBefore = player.cardsInHand.length;
    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    payment.cb(Payment.of({heat: 3}));

    expect(player.heat).eq(0);
    expect(player.cardsInHand).has.length(handBefore + 1);
    expect(game.gameLog.map(formatMessage).filter((message) => message.includes(`lost 3 heat because of ${card.name}`))).has.length(1);
  });

  it('supports Luna titanium as part of the draw payment and logs it', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new OmniHorizon();
    player.playedCards.push(card);
    card.allTags.add(Tag.SCIENCE);
    player.megaCredits = 1;
    player.canUseTitaniumAsMegacredits = true;
    player.titanium = 1;
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE]}));

    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();
    runAllActions(game);

    const payment = cast(player.popWaitingFor(), SelectPayment);
    payment.cb(Payment.of({megacredits: 1, titanium: 1}));

    expect(player.megaCredits).eq(0);
    expect(player.titanium).eq(0);
    expect(game.gameLog.map(formatMessage).filter((message) => message.includes(`lost 1 titanium because of ${card.name}`))).has.length(1);
  });

  it('waits for a mixed Stormcraft heat payment before drawing and logging', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const stormcraft = new StormCraftIncorporated();
    player.playCorporationCard(new Helion());
    player.playCorporationCard(stormcraft);
    runAllActions(game);
    const card = new OmniHorizon();
    player.playedCards.push(card);
    card.allTags.add(Tag.SCIENCE);
    player.playedCards.push(fakeCard({tags: Array(4).fill(Tag.SCIENCE)}));
    player.megaCredits = 0;
    player.heat = 1;
    stormcraft.resourceCount = 1;
    const handBefore = player.cardsInHand.length;

    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();
    runAllActions(game);
    const payment = cast(player.popWaitingFor(), SelectPayment);
    const heatPayment = cast(payment.cb(Payment.of({heat: 3})), AndOptions);
    expect(player.cardsInHand).has.length(handBefore);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry.includes(`heat because of ${card.name}`))).is.empty;

    cast(heatPayment.options[0], SelectAmount).cb(1);
    cast(heatPayment.options[1], SelectAmount).cb(1);
    heatPayment.cb(undefined);
    expect(player.heat).eq(0);
    expect(stormcraft.resourceCount).eq(0);
    expect(player.cardsInHand).has.length(handBefore + 1);
    expect(game.gameLog.map(formatMessage).filter((entry) => entry === `blue lost 1 heat because of ${card.name}`)).has.length(1);
  });

  it('handles duplicate tags without drifting the next threshold', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new OmniHorizon();
    player.playedCards.push(card);
    player.megaCredits = 100;
    player.playedCards.push(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE, Tag.SCIENCE]}));

    player.playCard(fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    runAllActions(game);
    expect(player.cardsInHand).has.length(0);

    for (let i = 0; i < 3; i++) {
      player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    }
    runAllActions(game);
    expect(player.popWaitingFor()).to.be.undefined;

    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));
    runAllActions(game);
    expect(player.popWaitingFor()).instanceOf(OrOptions);
  });

  it('tracks non-card tags and persists both tag state and thresholds', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new OmniHorizon();
    player.playedCards.push(card);
    player.megaCredits = 10;
    player.tags.extraScienceTags = 4;
    card.allTags.add(Tag.SCIENCE);

    player.tags.extraScienceTags++;
    player.triggerOnNonCardTagAdded(Tag.SCIENCE);
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();

    const serialized = serializeCorporationCard(card);
    expect(serialized.allTags).deep.eq([Tag.SCIENCE]);
    expect(serialized.data).deep.eq({counts: {[Tag.SCIENCE]: 5}});

    const restored = cast(deserializeCorporationCard(serialized), OmniHorizon);
    expect(Array.from(restored.allTags)).deep.eq([Tag.SCIENCE]);
    expect(restored.data).deep.eq({counts: {[Tag.SCIENCE]: 5}});

    const serializedPlayer = player.serialize();
    const restoredPlayer = Player.deserialize(serializedPlayer);
    const restoredCard = cast(restoredPlayer.playedCards.get(CardName.OMNI_HORIZON), OmniHorizon);
    expect(Array.from(restoredCard.allTags)).deep.eq([Tag.SCIENCE]);
  });
});
