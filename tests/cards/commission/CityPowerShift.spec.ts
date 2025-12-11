
import {expect} from 'chai';
import {CityPowerShift} from '../../../src/server/cards/commission/CityPowerShift';
import {IGame} from '../../../src/server/IGame';
import {cast, churn, runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {testGame} from '../../TestGame';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';
import {PhobosSpaceHaven} from '../../../src/server/cards/base/PhobosSpaceHaven';

describe('CityPowerShift', () => {
  let card: CityPowerShift;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CityPowerShift();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
  });


  it('Should increase player\'s energy production when a city tile is placed', () => {
    let selectSpace = cast(churn(card.play(player), player), SelectSpace);
    expect(selectSpace).not.to.be.undefined;
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);
    expect(player.production.energy).to.eq(0);


    player.playCard(card, undefined, 'add');
    runAllActions(game);
    selectSpace = cast(player.popWaitingFor(), SelectSpace);
    expect(selectSpace).not.to.be.undefined;
    selectSpace.cb(selectSpace.spaces[0]);
    expect(player.production.energy).to.eq(1);

    // 我添加城
    game.addCity(player, game.board.getAvailableSpacesOnLand(player)[0]);
    runAllActions(game);
    expect(player.production.energy).to.eq(2);

    // 别人添加城
    game.addCity(player2, game.board.getAvailableSpacesOnLand(player)[0]);
    runAllActions(game);
    expect(player.production.energy).to.eq(2);

    // 我添加一个太空城
    player.playCard(new GanymedeColony(), undefined, 'add');
    runAllActions(game);
    expect(player.production.energy).to.eq(3);

    // 别人添加一个太空城
    player2.playCard(new PhobosSpaceHaven(), undefined, 'add');
    runAllActions(game);
    expect(player.production.energy).to.eq(3);
  });
});

