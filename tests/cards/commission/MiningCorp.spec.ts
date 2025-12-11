import {expect} from 'chai';
import {MiningCorp} from '../../../src/server/cards/commission/MiningCorp';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {IGame} from '../../../src/server/IGame';

describe('MiningCorp', () => {
  let card: MiningCorp;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MiningCorp();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('should start with 35 M€, 7 steel, draw 2 building cards', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    expect(card.startingMegaCredits).to.eq(35);
    expect(player.stock.get(Resource.STEEL)).to.eq(7);
    expect(player.cardsInHand.length).to.eq(2);
    expect(player.cardsInHand[0].tags).to.include(Tag.BUILDING);
    expect(player.cardsInHand[1].tags).to.include(Tag.BUILDING);
  });

  it('should increase steel value', () => {
    // 记录初始钢铁价值
    const initialSteelValue = player.getSteelValue();

    player.playCorporationCard(card);
    runAllActions(game);

    // 钢铁价值应该增加了
    expect(player.getSteelValue()).to.eq(initialSteelValue + 1);
  });
});
