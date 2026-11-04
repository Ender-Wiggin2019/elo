import {expect} from 'chai';
import {CardResource} from '../../../src/common/CardResource';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SparkfireEcology} from '../../../src/server/cards/commission/SparkfireEcology';
import {deserializeCorporationCard, serializeCorporationCard} from '../../../src/server/cards/CardSerialization';
import {cast, fakeCard, formatMessage, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('SparkfireEcology', () => {
  it('starts with titanium and fighters and scores -2 VP per fighter', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new SparkfireEcology();
    player.playCorporationCard(card);
    runAllActions(game);

    expect(card.type).eq(CardType.CORPORATION);
    expect(card.tags).deep.eq([Tag.SPACE]);
    expect(card.startingMegaCredits).eq(45);
    expect(card.resourceType).eq(CardResource.FIGHTER);
    expect(player.titanium).eq(5);
    expect(card.resourceCount).eq(5);
    expect(card.getVictoryPoints(player)).eq(-10);

    const logs = game.gameLog.map(formatMessage);
    expect(logs.filter((message) => message.includes('gained 5 titanium'))).has.length(1);
    expect(logs.filter((message) => message.includes('added 5 Fighter(s)'))).has.length(1);
  });

  it('offers one choice for each Jovian, Mars, or Animal tag and can skip', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new SparkfireEcology();
    player.playedCards.push(card);
    card.resourceCount = 2;
    player.titanium = 0;

    player.playCard(fakeCard({tags: [Tag.JOVIAN, Tag.MARS, Tag.ANIMAL]}));
    runAllActions(game);

    let options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(game);
    options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(game);
    options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb();

    expect(card.resourceCount).eq(0);
    expect(player.titanium).eq(2);
    expect(card.isDisabled).is.false;
  });

  it('flips after a later trigger when there are no fighters', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new SparkfireEcology();
    player.playedCards.push(card);
    card.resourceCount = 1;
    player.titanium = 0;

    player.playCard(fakeCard({tags: [Tag.ANIMAL]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();
    expect(card.resourceCount).eq(0);
    expect(player.titanium).eq(1);

    player.playCard(fakeCard({tags: [Tag.JOVIAN]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();

    expect(card.isDisabled).is.true;
    expect(card.tags).deep.eq([]);
    expect(player.tags.count(Tag.SPACE, 'raw')).eq(0);
    expect(player.titanium).eq(4);
    expect(card.getVictoryPoints(player)).eq(0);

    player.playCard(fakeCard({tags: [Tag.MARS, Tag.ANIMAL]}));
    runAllActions(game);
    expect(player.popWaitingFor()).to.be.undefined;
    expect(player.titanium).eq(4);
  });

  it('persists the disabled state and logs direct resource changes', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new SparkfireEcology();
    player.playedCards.push(card);
    card.resourceCount = 0;
    player.titanium = 0;

    player.playCard(fakeCard({tags: [Tag.JOVIAN]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();

    const logs = game.gameLog.map(formatMessage);
    expect(logs.filter((message) => message.includes('gained 3 titanium'))).has.length(1);
    expect(logs.filter((message) => message.includes('翻面'))).has.length(1);

    const serialized = serializeCorporationCard(card);
    expect(serialized.isDisabled).is.true;
    const restored = cast(deserializeCorporationCard(serialized), SparkfireEcology);
    expect(restored.isDisabled).is.true;
    expect(restored.tags).deep.eq([]);
  });

  it('does not spend fighters or titanium when the effect is skipped', () => {
    const [game, player] = testGame(1, {skipInitialShuffling: true});
    const card = new SparkfireEcology();
    player.playedCards.push(card);
    card.resourceCount = 2;
    player.titanium = 0;

    player.playCard(fakeCard({tags: [Tag.MARS]}));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();

    expect(card.resourceCount).eq(2);
    expect(player.stock.get(Resource.TITANIUM)).eq(0);
    expect(card.isDisabled).is.false;
  });
});
