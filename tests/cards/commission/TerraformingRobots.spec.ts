import {expect} from 'chai';
import {MAX_OXYGEN_LEVEL, MAX_TEMPERATURE} from '../../../src/common/constants';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TerraformingRobots} from '../../../src/server/cards/commission/TerraformingRobots';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast, runAllActions, setOxygenLevel, setRulingParty, setTemperature, testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('TerraformingRobots', () => {
  let card: TerraformingRobots;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TerraformingRobots();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.tagsForTest = {power: 1};
    player.megaCredits = card.cost;
  });

  it('has the commissioned card properties', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.cost).to.eq(7);
    expect(card.tags).to.deep.eq([Tag.POWER, Tag.BUILDING]);
    expect(card.requirements).to.deep.eq([{tag: Tag.POWER, count: 1}]);
  });

  it('offers all four payment and parameter combinations when affordable', () => {
    player.energy = 3;
    player.megaCredits = 8;
    expect(card.canAct(player)).to.be.true;

    const options = cast(card.action(player), OrOptions);
    expect(options.options).to.have.length(4);
    expect(options.options.map((option) => option.title)).to.deep.eq([
      'Spend 3 energy to raise temperature 1 step',
      'Spend 3 energy to raise oxygen 1 step',
      'Spend 8 M€ to raise temperature 1 step',
      'Spend 8 M€ to raise oxygen 1 step',
    ]);
  });

  it('spends energy and raises temperature', () => {
    player.energy = 3;
    const oldTemperature = game.getTemperature();
    const options = cast(card.action(player), OrOptions);
    const option = options.options.find((candidate) => candidate.title === 'Spend 3 energy to raise temperature 1 step');
    expect(option).to.exist;
    option!.cb(undefined);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(game.getTemperature()).to.eq(oldTemperature + 2);
  });

  it('spends M€ and raises oxygen', () => {
    player.megaCredits = 8;
    const oldOxygen = game.getOxygenLevel();
    const options = cast(card.action(player), OrOptions);
    const option = options.options.find((candidate) => candidate.title === 'Spend 8 M€ to raise oxygen 1 step');
    expect(option).to.exist;
    option!.cb(undefined);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(game.getOxygenLevel()).to.eq(oldOxygen + 1);
  });

  it('accounts for Reds when checking both payment paths', () => {
    [game, player] = testGame(1, {turmoilExtension: true, skipInitialShuffling: true});
    player.tagsForTest = {power: 1};
    setRulingParty(game, PartyName.REDS);
    player.energy = 3;
    player.megaCredits = 3;

    expect(card.canAct(player)).to.be.true;
    const options = cast(card.action(player), OrOptions);
    expect(options.options).to.have.length(2);
    const option = options.options.find((candidate) => candidate.title === 'Spend 3 energy to raise temperature 1 step');
    expect(option).to.exist;
    option!.cb(undefined);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(player.megaCredits).to.eq(0);
  });

  it('does not offer a parameter that is already at its ceiling', () => {
    player.energy = 3;
    player.megaCredits = 8;
    setTemperature(game, MAX_TEMPERATURE);
    expect(card.canAct(player)).to.be.true;
    const oxygenOptions = cast(card.action(player), OrOptions);
    expect(oxygenOptions.options).to.have.length(2);
    expect(oxygenOptions.options.every((option) => option.title.toString().includes('oxygen'))).to.be.true;

    setOxygenLevel(game, MAX_OXYGEN_LEVEL);
    expect(card.canAct(player)).to.be.false;
    expect(card.action(player)).to.be.undefined;
  });
});
