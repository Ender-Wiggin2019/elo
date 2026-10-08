import {expect} from 'chai';
import {Luna} from '../../../src/server/colonies/Luna';
import {Triton} from '../../../src/server/colonies/Triton';
import {OrbitalDocking} from '../../../src/server/cards/commission/OrbitalDocking';
import {ProductiveOutpost} from '../../../src/server/cards/colonies/ProductiveOutpost';
import {Yvonne} from '../../../src/server/cards/ceos/Yvonne';
import {ImperialStarDestroyer} from '../../../src/server/cards/eros/corp/ImperialStarDestroyer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('OrbitalDocking', () => {
  it('adds one colony bonus after the colony multiplicity for 1, 2, or 3 colonies', () => {
    for (const colonyCount of [1, 2, 3]) {
      const [game, player, trader] = testGame(2, {coloniesExtension: true});
      const colony = new Luna();
      game.colonies = [colony];
      player.playedCards.push(new OrbitalDocking());
      for (let i = 0; i < colonyCount; i++) {
        colony.colonies.push(player);
      }

      colony.trade(trader, {usesTradeFleet: false});
      runAllActions(game);

      expect(player.megaCredits, `colony count ${colonyCount}`).to.eq(2 * (colonyCount + 1));
      expect(trader.megaCredits, `colony count ${colonyCount}`).to.eq(2);
    }
  });

  it('does not grant a bonus when there are no colonies', () => {
    const [game, player, trader] = testGame(2, {coloniesExtension: true});
    const colony = new Luna();
    game.colonies = [colony];
    player.playedCards.push(new OrbitalDocking());

    colony.trade(trader, {usesTradeFleet: false});
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(trader.megaCredits).to.eq(2);
  });

  it('adds the Orbital Docking bonus after Imperial Star Destroyer doubles trade bonuses', () => {
    const [game, player, trader] = testGame(2, {coloniesExtension: true});
    const colony = new Luna();
    game.colonies = [colony];
    player.playedCards.push(new OrbitalDocking(), new ImperialStarDestroyer());
    colony.colonies.push(player);

    colony.trade(trader, {usesTradeFleet: false});
    runAllActions(game);

    expect(player.megaCredits).to.eq(6); // 2 M€ twice, plus Orbital Docking's one extra bonus
    expect(trader.megaCredits).to.eq(2);
  });

  it('adds one bonus to card-driven payouts rather than one per colony', () => {
    const [game, player] = testGame(2, {coloniesExtension: true});
    const colony = new Luna();
    game.colonies = [colony];
    player.playedCards.push(new OrbitalDocking());
    colony.colonies.push(player, player);

    new ProductiveOutpost().play(player);
    runAllActions(game);
    expect(player.megaCredits).to.eq(6); // (2 colonies + 1 extra) * 2 M€

    new Yvonne().action(player);
    runAllActions(game);
    expect(player.megaCredits).to.eq(16); // (2 colonies * 2 bonuses + 1 extra) * 2 M€
  });

  it('adds one extra card-driven bonus on each colony tile', () => {
    const [game, player] = testGame(2, {coloniesExtension: true});
    const luna = new Luna();
    const triton = new Triton();
    game.colonies = [luna, triton];
    player.playedCards.push(new OrbitalDocking());
    luna.colonies.push(player, player);
    triton.colonies.push(player);

    new ProductiveOutpost().play(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(6); // (2 colonies + 1 extra) * 2 M€
    expect(player.titanium).to.eq(2); // (1 colony + 1 extra) * 1 titanium
  });

  it('only doubles the bonus for the player who owns Orbital Docking', () => {
    const [game, player, colonyOwner, trader] = testGame(3, {coloniesExtension: true});
    const colony = new Luna();
    game.colonies = [colony];
    player.playedCards.push(new OrbitalDocking());
    colony.colonies.push(colonyOwner);

    colony.trade(trader, {usesTradeFleet: false});
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(colonyOwner.megaCredits).to.eq(2);
    expect(trader.megaCredits).to.eq(2);
  });

  it('doubles the selfish colony bonus for the trader', () => {
    const [game, player, colonyOwner] = testGame(2, {coloniesExtension: true});
    const colony = new Luna();
    game.colonies = [colony];
    player.playedCards.push(new OrbitalDocking());
    colony.colonies.push(colonyOwner);

    colony.trade(player, {usesTradeFleet: false, selfishTrade: true});
    runAllActions(game);

    expect(player.megaCredits).to.eq(6); // 2 M€ trade income plus 4 M€ of colony bonuses
    expect(colonyOwner.megaCredits).to.eq(0);
  });
});
