import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {MeteoriteArc} from '../../../src/server/cards/commission/MeteoriteArc';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {cast, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('MeteoriteArc', () => {
  let card: MeteoriteArc;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MeteoriteArc();
    [game, player] = testGame(1, {skipInitialShuffling: true});
  });

  it('has the expected event cost and space tag', () => {
    expect(card.type).to.eq(CardType.EVENT);
    expect(card.cost).to.eq(17);
    expect(card.tags).to.deep.eq([Tag.SPACE]);
    expect(card.metadata.cardNumber).to.eq('XB89');
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).to.be.true;
  });

  it('places an ocean and gains three energy when played', () => {
    const startingOceans = game.board.getOceanSpaces().length;
    const startingTR = player.getTerraformRating();

    player.playCard(card);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(game.board.getOceanSpaces()).to.have.length(startingOceans + 1);
    expect(player.energy).to.eq(3);
    expect(player.production.energy).to.eq(0);
    expect(player.getTerraformRating()).to.eq(startingTR + 1);
  });
});
