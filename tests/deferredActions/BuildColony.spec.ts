import {expect} from 'chai';
import {BuildColony} from '../../src/server/deferredActions/BuildColony';
import {TestPlayer} from '../TestPlayer';
import {cast} from '../TestingUtils';
import {testGame} from '../TestGame';
import {ColonyName} from '../../src/common/colonies/ColonyName';
import {SelectColony} from '../../src/server/inputs/SelectColony';
import {ColoniesHandler} from '../../src/server/colonies/ColoniesHandler';

describe('BuildColony', function() {
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;

  beforeEach(function() {
    [/* unused */, player, player2, player3] = testGame(3, {
      coloniesExtension: true,
      customColoniesList: [
        // The important thing is that Europa is absent.
        ColonyName.GANYMEDE,
        ColonyName.LUNA,
        ColonyName.PLUTO,
        ColonyName.TITAN,
        ColonyName.TRITON],
    });
  });

  it('simple', function() {
    const ganymede = ColoniesHandler.getColony(player.game, ColonyName.GANYMEDE);
    expect(ganymede.colonies).deep.eq([]);

    const buildColony = new BuildColony(player);
    const selectColony = cast(buildColony.execute(), SelectColony);
    const colonyName = selectColony.colonies[0].name;

    expect(colonyName).eq(ColonyName.GANYMEDE);

    selectColony.cb(selectColony.colonies[0]);

    expect(player.production.plants).eq(1);
    expect(ganymede.colonies).deep.eq([player]);
  });

  it('Does not allow duplicates by default', function() {
    const ganymede = ColoniesHandler.getColony(player.game, ColonyName.GANYMEDE);
    ganymede.colonies = [player];

    const buildColony = new BuildColony(player);
    const selectColony = cast(buildColony.execute(), SelectColony);

    expect(selectColony.colonies).does.not.include(ganymede);
  });

  it('Cannot play on full colonies', function() {
    const ganymede = ColoniesHandler.getColony(player.game, ColonyName.GANYMEDE);
    ganymede.colonies = [player2, player3, player2];

    const buildColony = new BuildColony(player);
    const selectColony = cast(buildColony.execute(), SelectColony);

    expect(selectColony.colonies).does.not.include(ganymede);
  });

  it('Cannot play on full colonies, even if duplicates are allowed', function() {
    const ganymede = ColoniesHandler.getColony(player.game, ColonyName.GANYMEDE);
    ganymede.colonies = [player2, player3, player2];

    const buildColony = new BuildColony(player, {allowDuplicate: true});
    const selectColony = cast(buildColony.execute(), SelectColony);

    expect(selectColony.colonies).does.not.include(ganymede);
  });

  it('allows duplicates', function() {
    const ganymede = ColoniesHandler.getColony(player.game, ColonyName.GANYMEDE);
    ganymede.colonies = [player];

    const buildColony = new BuildColony(player, {allowDuplicate: true});
    const selectColony = cast(buildColony.execute(), SelectColony);
    const colonyName = selectColony.colonies[0].name;

    expect(colonyName).eq(ColonyName.GANYMEDE);

    selectColony.cb(selectColony.colonies[0]);

    expect(player.production.plants).eq(1);
    expect(ganymede.colonies).deep.eq([player, player]);
  });
});
