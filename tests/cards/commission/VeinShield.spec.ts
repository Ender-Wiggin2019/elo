import {expect} from 'chai';
import {VeinShield} from '../../../src/server/cards/commission/VeinShield';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {RemoveResources} from '../../../src/server/deferredActions/RemoveResources';
import {StealResources} from '../../../src/server/deferredActions/StealResources';
import {ProtectedHabitats} from '../../../src/server/cards/base/ProtectedHabitats';
import {BotanicalExperience} from '../../../src/server/cards/pathfinders/BotanicalExperience';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';
import {GlobalEventName} from '../../../src/common/turmoil/globalEvents/GlobalEventName';
import {assertIsMaybeBlock} from '../../underworld/underworldAssertions';

describe('VeinShield', () => {
  let card: VeinShield;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new VeinShield();
    [, player, player2] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('has the expected properties', () => {
    expect(card.cost).to.eq(8);
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).to.deep.eq([Tag.PLANT]);
  });

  it('spends 3 plants to gain 3 titanium', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.stock.override({plants: 3, titanium: 0});
    const before = player.megaCredits;

    expect(card.canAct(player)).to.be.true;
    card.action(player);

    expect(player.stock.get(Resource.PLANTS)).to.eq(0);
    expect(player.stock.get(Resource.TITANIUM)).to.eq(3);
    expect(player.megaCredits).to.eq(before);
  });

  it('cannot act with fewer than 3 plants', () => {
    player.plants = 2;
    expect(card.canAct(player)).to.be.false;
  });

  it('compensates only the victim when both players have Vein Shield', () => {
    player.playCard(card);
    runAllActions(player.game);
    player2.playedCards.push(new VeinShield());
    player.plants = 2;
    const before = player.megaCredits;
    const attackerBefore = player2.megaCredits;

    player.stock.deduct(Resource.PLANTS, 3, {log: true, from: {player: player2}});

    expect(player.plants).to.eq(0);
    expect(player.megaCredits).to.eq(before + 4);
    expect(player2.megaCredits).to.eq(attackerBefore);
  });

  it('does not reward removing another player\'s plants', () => {
    player.playCard(card);
    runAllActions(player.game);
    player2.plants = 3;
    const before = player.megaCredits;

    player2.stock.deduct(Resource.PLANTS, 3, {log: true, from: {player}});

    expect(player2.plants).to.eq(0);
    expect(player.megaCredits).to.eq(before);
    expect(player2.megaCredits).to.eq(0);
  });

  it('does not reward removing your own plants', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.stock.override({plants: 3});
    const before = player.megaCredits;

    player.stock.deduct(Resource.PLANTS, 3, {log: true, from: {player}});

    expect(player.megaCredits).to.eq(before);
  });

  it('does not compensate spending plants or losses caused by non-player effects', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 9;
    const before = player.megaCredits;

    player.stock.deduct(Resource.PLANTS, 3, {log: true});
    player.stock.deduct(Resource.PLANTS, 3, {log: true, from: {card}});
    player.stock.deduct(Resource.PLANTS, 3, {log: true, from: {globalEvent: GlobalEventName.ECO_SABOTAGE}});

    expect(player.plants).to.eq(0);
    expect(player.megaCredits).to.eq(before);
  });

  it('does not compensate when no plants are actually lost', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 0;
    const before = player.megaCredits;

    player.stock.deduct(Resource.PLANTS, 3, {log: true, from: {player: player2}});

    expect(player.megaCredits).to.eq(before);
  });

  it('does not compensate gaining plants or losing other resources', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.heat = 3;
    const before = player.megaCredits;

    player.stock.add(Resource.PLANTS, 3, {log: true, from: {player: player2}});
    player.stock.deduct(Resource.HEAT, 3, {log: true, from: {player: player2}});

    expect(player.plants).to.eq(3);
    expect(player.heat).to.eq(0);
    expect(player.megaCredits).to.eq(before);
  });

  it('compensates only plants actually lost through RemoveResources', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 2;
    const before = player.megaCredits;

    new RemoveResources(player, player2, Resource.PLANTS, 3).execute();
    runAllActions(player.game);

    expect(player.plants).to.eq(0);
    expect(player.megaCredits).to.eq(before + 4);
    expect(player2.megaCredits).to.eq(0);
  });

  it('does not compensate protected plants through RemoveResources or StealResources', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 4;
    player.playedCards.push(new ProtectedHabitats());
    const before = player.megaCredits;

    new RemoveResources(player, player2, Resource.PLANTS, 4).execute();
    runAllActions(player.game);
    player.game.defer(new StealResources(player2, Resource.PLANTS, 4));
    runAllActions(player.game);

    expect(player.plants).to.eq(4);
    expect(player.megaCredits).to.eq(before);
    expect(player2.plants).to.eq(0);
  });

  it('compensates the reduced amount removed through Botanical Experience', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 5;
    player.playedCards.push(new BotanicalExperience());
    const before = player.megaCredits;

    new RemoveResources(player, player2, Resource.PLANTS, 5).execute();
    runAllActions(player.game);

    expect(player.plants).to.eq(2);
    expect(player.megaCredits).to.eq(before + 6);
  });

  it('compensates plants actually stolen through StealResources', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 2;
    const before = player.megaCredits;

    player.game.defer(new StealResources(player2, Resource.PLANTS, 3));
    runAllActions(player.game);
    const options = cast(player2.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(player.game);

    expect(player.plants).to.eq(0);
    expect(player2.plants).to.eq(2);
    expect(player.megaCredits).to.eq(before + 4);
    expect(player2.megaCredits).to.eq(0);
  });

  it('compensates the reduced amount actually stolen through Botanical Experience', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.plants = 5;
    player.playedCards.push(new BotanicalExperience());
    const before = player.megaCredits;

    player.game.defer(new StealResources(player2, Resource.PLANTS, 5));
    runAllActions(player.game);
    const options = cast(player2.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(player.game);

    expect(player.plants).to.eq(2);
    expect(player2.plants).to.eq(3);
    expect(player.megaCredits).to.eq(before + 6);
  });

  it('does not compensate an attack blocked with corruption', () => {
    [, player, player2] = testGame(2, {underworldExpansion: true, skipInitialShuffling: true});
    player.playedCards.push(card);
    player.plants = 4;
    player.underworldData.corruption = 1;
    const before = player.megaCredits;

    new RemoveResources(player, player2, Resource.PLANTS, 3).execute();
    runAllActions(player.game);
    const options = cast(player.popWaitingFor(), OrOptions);
    assertIsMaybeBlock(player2, options, 'corruption');
    runAllActions(player.game);

    expect(player.plants).to.eq(4);
    expect(player.underworldData.corruption).to.eq(0);
    expect(player.megaCredits).to.eq(before);
  });
});
