import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {GreenEarthSurvey} from '../../../src/server/cards/commission/GreenEarthSurvey';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard, formatMessage, testGame} from '../../TestingUtils';

describe('GreenEarthSurvey', () => {
  let card: GreenEarthSurvey;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GreenEarthSurvey();
    [game, player] = testGame(1, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  function playWithTopCard(tags: Array<Tag>, type = CardType.AUTOMATED) {
    const topCard = fakeCard({tags, type});
    game.projectDeck.drawPile.push(topCard);
    card.play(player);
    expect(game.projectDeck.discardPile).to.include(topCard);
    expect(game.gameLog.map(formatMessage)).to.include('blue revealed and discarded ' + topCard.name);
  }

  it('has the expected automated Earth requirement', () => {
    expect(card.type).to.eq(CardType.AUTOMATED);
    expect(card.cost).to.eq(11);
    expect(card.tags).to.deep.eq([Tag.SCIENCE, Tag.BUILDING]);
    expect(card.requirements).to.deep.eq([{tag: Tag.EARTH, count: 2}]);
    expect(card.metadata.cardNumber).to.eq('XB97');
  });

  it('gains 8 plants for a revealed plant tag', () => {
    playWithTopCard([Tag.PLANT]);
    expect(player.plants).to.eq(8);
    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(100);
    expect(game.gameLog.map(formatMessage)).to.include('blue gained 8 plants because of 🌸绿地勘测🌸');
  });

  it('gains both rewards when a revealed card has plant and Earth tags', () => {
    playWithTopCard([Tag.PLANT, Tag.EARTH, Tag.EARTH]);
    expect(player.plants).to.eq(8);
    expect(player.titanium).to.eq(6);
    expect(player.megaCredits).to.eq(100);
    expect(game.gameLog.map(formatMessage)).to.include('blue gained 8 plants because of 🌸绿地勘测🌸');
    expect(game.gameLog.map(formatMessage)).to.include('blue gained 6 titanium because of 🌸绿地勘测🌸');
  });

  it('gains 6 titanium for a revealed Earth tag without plant', () => {
    playWithTopCard([Tag.EARTH]);
    expect(player.plants).to.eq(0);
    expect(player.titanium).to.eq(6);
    expect(player.megaCredits).to.eq(100);
  });

  it('gains 10 energy instead of M€ when the revealed card has no tags', () => {
    playWithTopCard([]);
    expect(player.energy).to.eq(10);
    expect(player.production.energy).to.eq(0);
    expect(player.plants).to.eq(0);
    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(100);
    expect(game.gameLog.map(formatMessage)).to.include('blue gained 10 energy because of 🌸绿地勘测🌸');
  });

  it('gains 4 M€ when the revealed card matches none of the three conditions', () => {
    playWithTopCard([Tag.SCIENCE]);
    expect(player.plants).to.eq(0);
    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(104);
    expect(game.gameLog.map(formatMessage)).to.include('blue gained 4 M€ because of 🌸绿地勘测🌸');
  });

  it('counts the event tag on an event with no other printed tags', () => {
    playWithTopCard([], CardType.EVENT);
    expect(player.energy).to.eq(0);
    expect(player.megaCredits).to.eq(104);
  });

  it('cannot play without a card to reveal', () => {
    game.projectDeck.drawPile.length = 0;
    game.projectDeck.discardPile.length = 0;
    expect(card.canPlay(player)).to.be.false;
  });
});
