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

    expect(card.canAct(player)).to.be.true;
    card.action(player);

    expect(player.stock.get(Resource.PLANTS)).to.eq(0);
    expect(player.stock.get(Resource.TITANIUM)).to.eq(3);
  });

  it('gains 2 M€ per plant actually removed from another player', () => {
    player.playCard(card);
    runAllActions(player.game);
    player2.stock.override({plants: 2});
    const before = player.megaCredits;

    player2.stock.deduct(Resource.PLANTS, 3, {log: true, from: {player}});

    expect(player2.stock.get(Resource.PLANTS)).to.eq(0);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('does not reward removing your own plants', () => {
    player.playCard(card);
    runAllActions(player.game);
    player.stock.override({plants: 3});
    const before = player.megaCredits;

    player.stock.deduct(Resource.PLANTS, 3, {log: true, from: {player}});

    expect(player.megaCredits).to.eq(before);
  });

  it('rewards only plants actually removed through RemoveResources', () => {
    player.playCard(card);
    runAllActions(player.game);
    player2.plants = 2;
    const before = player.megaCredits;

    new RemoveResources(player2, player, Resource.PLANTS, 3).execute();
    runAllActions(player.game);

    expect(player2.plants).to.eq(0);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('does not reward protected plants through RemoveResources or StealResources', () => {
    player.playCard(card);
    runAllActions(player.game);
    player2.plants = 4;
    player2.playedCards.push(new ProtectedHabitats());
    const before = player.megaCredits;

    new RemoveResources(player2, player, Resource.PLANTS, 4).execute();
    runAllActions(player.game);
    player.game.defer(new StealResources(player, Resource.PLANTS, 4));
    runAllActions(player.game);

    expect(player2.plants).to.eq(4);
    expect(player.megaCredits).to.eq(before);
    expect(player.plants).to.eq(0);
  });

  it('rewards the reduced amount actually stolen through Botanical Experience', () => {
    player.playCard(card);
    runAllActions(player.game);
    player2.plants = 4;
    player2.playedCards.push(new BotanicalExperience());
    const before = player.megaCredits;

    player.game.defer(new StealResources(player, Resource.PLANTS, 4));
    runAllActions(player.game);
    const options = cast(player.getWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(player.game);

    expect(player2.plants).to.eq(2);
    expect(player.plants).to.eq(2);
    expect(player.megaCredits).to.eq(before + 4);
  });
});
