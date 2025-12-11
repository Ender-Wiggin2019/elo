import {expect} from 'chai';
import {RunciterAssociates} from '../../../../src/server/cards/eros/corp/RunciterAssociates';
import {testGame, runAllActions, cast} from '../../../TestingUtils';
import {TestPlayer} from '../../../TestPlayer';
import {IGame} from '../../../../src/server/IGame';
import {SelectCard} from '../../../../src/server/inputs/SelectCard';
import {Lichen} from '../../../../src/server/cards/base/Lichen';
import {Tag} from '../../../../src/common/cards/Tag';
import {OlympusConference} from '../../../../src/server/cards/base/OlympusConference';
import {Comet} from '../../../../src/server/cards/base/Comet';
import {DustSeals} from '../../../../src/server/cards/base/DustSeals';

describe('RunciterAssociates', () => {
  let card: RunciterAssociates;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new RunciterAssociates();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.playCorporationCard(card);
  });


  it('弃单tag卡牌应抽1张同tag牌', () => {
    player.cardsInHand = [new Lichen()]; // PLANT tag
    const input = card.action(player);
    expect(input).to.exist;
    const select = cast(input, SelectCard);
    select.cb([player.cardsInHand[0]]);
    runAllActions(game);
    // 弃1张，抽1张
    expect(player.cardsInHand.length).to.eq(1);
    expect(player.cardsInHand[0].tags).to.include(Tag.PLANT);
  });

  it('弃多tag卡牌应每tag各抽1张', () => {
    player.cardsInHand = [new OlympusConference()];
    const input = card.action(player);
    expect(input).to.exist;
    const select = cast(input, SelectCard);
    select.cb([player.cardsInHand[0]]);
    runAllActions(game);
    // 弃1张，抽3张
    expect(player.cardsInHand.length).to.eq(3);
    expect(player.cardsInHand[0].tags).to.include(Tag.SCIENCE);
    expect(player.cardsInHand[1].tags).to.include(Tag.EARTH);
    expect(player.cardsInHand[2].tags).to.include(Tag.BUILDING);
  });

  it('弃event tag卡牌也要抽牌', () => {
    const eventCard = new Comet();
    player.cardsInHand = [eventCard];
    const input = card.action(player);
    expect(input).to.exist;
    const select = cast(input, SelectCard);
    select.cb([player.cardsInHand[0]]);
    runAllActions(game);
    // 弃1张，抽1张
    expect(player.cardsInHand.length).to.eq(1);
    expect(player.cardsInHand[0].tags).to.include(Tag.SPACE);
  });

  it('弃无tag卡牌不抽牌', () => {
    const noTagCard = new DustSeals();
    player.cardsInHand = [noTagCard];
    const input = card.action(player);
    expect(input).to.exist;
    const select = cast(input, SelectCard);
    select.cb([player.cardsInHand[0]]);
    runAllActions(game);
    // 弃1张，抽0张
    expect(player.cardsInHand.length).to.eq(0);
  });

  it('无手牌时不可行动', () => {
    player.cardsInHand = [];
    expect(card.canAct(player)).to.be.false;
  });
});
