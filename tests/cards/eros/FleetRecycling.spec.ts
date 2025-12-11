import {expect} from 'chai';
import {FleetRecycling} from '../../../src/server/cards/eros/FleetRecycling';
import {CardName} from '../../../src/common/cards/CardName';
import {testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {Resource} from '../../../src/common/Resource';


describe('FleetRecycling', () => {
  let card: FleetRecycling;
  let player: TestPlayer;
  // let game: IGame;

  beforeEach(() => {
    card = new FleetRecycling();
    [, player] = testGame(1, {coloniesExtension: true, skipInitialShuffling: true});
  });

  it('should not be playable if no trade fleet', () => {
    player.colonies.setFleetSize(0);
    expect(card.canPlay(player)).to.be.false;
  });

  it('should play and lose 1 fleet, gain 4 steel and 4 titanium, no points', () => {
    player.colonies.setFleetSize(2);
    const fleetBefore = player.colonies.getFleetSize();
    player.playCard(card);
    expect(player.playedCards.get(CardName.FLEET_RECYCLING)).to.exist;
    expect(player.getVictoryPoints().victoryPoints).to.eq(0);
    expect(player.colonies.getFleetSize()).to.eq(fleetBefore - 1);
    expect(player.stock.get(Resource.STEEL)).to.eq(4);
    expect(player.stock.get(Resource.TITANIUM)).to.eq(4);
  });
});
