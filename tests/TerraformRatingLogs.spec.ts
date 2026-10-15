import {expect} from 'chai';
import {CardResource} from '../src/common/CardResource';
import {Phase} from '../src/common/Phase';
import {CardName} from '../src/common/cards/CardName';
import {MAX_TEMPERATURE} from '../src/common/constants';
import {PartyName} from '../src/common/turmoil/PartyName';
import {IGame} from '../src/server/IGame';
import {DustCombustion} from '../src/server/cards/commission/DustCombustion';
import {RedPlanetOceans} from '../src/server/cards/commission/RedPlanetOceans';
import {TerraformingRobots} from '../src/server/cards/commission/TerraformingRobots';
import {PlaceOceanTile} from '../src/server/deferredActions/PlaceOceanTile';
import {OrOptions} from '../src/server/inputs/OrOptions';
import {SelectSpace} from '../src/server/inputs/SelectSpace';
import {testGame} from './TestGame';
import {TestPlayer} from './TestPlayer';
import {cast, fakeCard, formatMessage, maxOutOceans, runAllActions, setOxygenLevel, setRulingParty, setTemperature, setVenusScaleLevel} from './TestingUtils';

function trGains(game: IGame): Array<string> {
  return game.gameLog
    .filter((entry) => entry.message === '${0} gained ${1} TR' || entry.message === '${0} gained ${1} TR from ${2}')
    .map(formatMessage);
}

describe('Terraform rating gain logs', () => {
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    [game, player] = testGame(2, {skipInitialShuffling: true});
    setTemperature(game, -10);
    game.gameLog.length = 0;
  });

  for (const parameter of ['temperature', 'oxygen'] as const) {
    for (const payment of ['3 energy', '8 M€']) {
      it(`logs TR from Terraforming Robots raising ${parameter} with ${payment} exactly once`, () => {
        player.energy = payment === '3 energy' ? 3 : 0;
        player.megaCredits = payment === '8 M€' ? 8 : 0;
        const before = player.terraformRating;
        const options = cast(new TerraformingRobots().action(player), OrOptions);
        options.options.find((option) => option.title === `Spend ${payment} to raise ${parameter} 1 step`)!.cb(undefined);
        runAllActions(game);

        expect(player.terraformRating).eq(before + 1);
        expect(trGains(game)).deep.eq(['blue gained 1 TR']);
      });
    }
  }

  for (const resource of ['megacredits', 'heat']) {
    it(`logs TR from Red Planet Oceans paid with ${resource} after placing its ocean`, () => {
      const card = new RedPlanetOceans();
      player.playedCards.push(card);
      player.megaCredits = resource === 'megacredits' ? 15 : 0;
      player.heat = resource === 'heat' ? 10 : 0;
      const before = player.terraformRating;
      card.action(player);
      runAllActions(game);
      expect(trGains(game)).is.empty;

      const input = cast(player.popWaitingFor(), SelectSpace);
      input.cb(input.spaces[0]);
      runAllActions(game);

      expect(player.terraformRating).eq(before + 1);
      expect(trGains(game)).deep.eq(['blue gained 1 TR']);
    });
  }

  it('logs TR from an ocean attempt at the cap with Red Planet Oceans as its source', () => {
    player.playedCards.push(new RedPlanetOceans());
    maxOutOceans(player);
    game.gameLog.length = 0;
    const before = player.terraformRating;

    game.defer(new PlaceOceanTile(player));
    runAllActions(game);

    expect(player.terraformRating).eq(before + 1);
    expect(trGains(game)).deep.eq([`blue gained 1 TR from ${CardName.RED_PLANET_OCEANS}`]);
  });

  it('logs the actual TR gained from Dust Combustion without counting its oxygen decrease', () => {
    player.playedCards.push(fakeCard({resourceType: CardResource.FLOATER, resourceCount: 1}));
    setOxygenLevel(game, 8);
    const before = player.terraformRating;

    player.playCard(new DustCombustion());
    runAllActions(game);

    expect(player.terraformRating).eq(before + 2);
    expect(trGains(game)).deep.eq(['blue gained 2 TR']);
  });

  it('logs only the temperature steps available before the cap', () => {
    setTemperature(game, MAX_TEMPERATURE - 2);
    const before = player.terraformRating;
    game.increaseTemperature(player, 2);
    runAllActions(game);

    expect(player.terraformRating).eq(before + 1);
    expect(trGains(game)).deep.eq(['blue gained 1 TR']);

    game.increaseTemperature(player, 1);
    expect(trGains(game)).has.length(1);
  });

  it('logs the Venus increase and its threshold TR bonus', () => {
    setVenusScaleLevel(game, 14);
    const before = player.terraformRating;
    game.increaseVenusScaleLevel(player, 1);
    runAllActions(game);

    expect(player.terraformRating).eq(before + 2);
    expect(trGains(game)).deep.eq(['blue gained 1 TR', 'blue gained 1 TR']);
  });

  it('logs the reduced gain after Preservation Program blocks one TR', () => {
    game.phase = Phase.ACTION;
    player.preservationProgram = true;
    const before = player.terraformRating;
    game.increaseTemperature(player, 2);
    runAllActions(game);

    expect(player.terraformRating).eq(before + 1);
    expect(trGains(game)).deep.eq(['blue gained 1 TR']);
  });

  it('does not log a gain when Preservation Program blocks the entire increase', () => {
    game.phase = Phase.ACTION;
    player.preservationProgram = true;
    const before = player.terraformRating;
    game.increaseTemperature(player, 1);
    runAllActions(game);

    expect(player.terraformRating).eq(before);
    expect(trGains(game)).is.empty;
  });

  for (const parameter of ['temperature', 'oxygen', 'venus', 'oceans']) {
    it(`credits only the WG Partnership owner in the solar ${parameter} gain log`, () => {
      const owner = game.players[1];
      game.wgPartnershipOwner = owner;
      game.phase = Phase.SOLAR;
      const actorBefore = player.terraformRating;
      const ownerBefore = owner.terraformRating;

      switch (parameter) {
      case 'temperature': game.increaseTemperature(player, 1); break;
      case 'oxygen': game.increaseOxygenLevel(player, 1); break;
      case 'venus': game.increaseVenusScaleLevel(player, 1); break;
      case 'oceans': game.addOcean(player, game.board.getAvailableSpacesForOcean(player)[0]); break;
      }
      runAllActions(game);

      expect(player.terraformRating).eq(actorBefore);
      expect(owner.terraformRating).eq(ownerBefore + 1);
      expect(trGains(game)).deep.eq(['red gained 1 TR']);
    });
  }

  it('logs a Reds gain only after its surcharge is paid', () => {
    [game, player] = testGame(2, {turmoilExtension: true, skipInitialShuffling: true});
    setTemperature(game, -10);
    setRulingParty(game, PartyName.REDS);
    game.gameLog.length = 0;
    player.megaCredits = 3;
    const before = player.terraformRating;
    game.increaseTemperature(player, 1);

    expect(player.terraformRating).eq(before);
    expect(trGains(game)).is.empty;
    runAllActions(game);

    expect(player.megaCredits).eq(0);
    expect(player.terraformRating).eq(before + 1);
    expect(trGains(game)).deep.eq(['blue gained 1 TR']);
  });

  it('does not log a TR gain when the Reds surcharge is unaffordable', () => {
    [game, player] = testGame(2, {turmoilExtension: true, skipInitialShuffling: true});
    setRulingParty(game, PartyName.REDS);
    game.gameLog.length = 0;
    const before = player.terraformRating;
    game.increaseTemperature(player, 1);
    runAllActions(game);

    expect(player.terraformRating).eq(before);
    expect(trGains(game)).is.empty;
  });

  for (const phase of [Phase.SOLAR, Phase.INTERGENERATION]) {
    it(`does not log owner TR from an ocean attempt at the cap during ${phase}`, () => {
      player.playedCards.push(new RedPlanetOceans());
      maxOutOceans(player);
      game.gameLog.length = 0;
      game.phase = phase;
      const before = player.terraformRating;
      game.defer(new PlaceOceanTile(player));
      runAllActions(game);

      expect(player.terraformRating).eq(before);
      expect(trGains(game)).is.empty;
    });
  }
});
