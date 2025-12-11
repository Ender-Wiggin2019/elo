import {expect} from 'chai';
import {NoctisFarming} from '../../../src/server/cards/base/NoctisFarming';
import {Resource} from '../../../src/common/Resource';
import {addCity, cast, runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {SolarWindPower} from '../../../src/server/cards/base/SolarWindPower';
import {ResearchNetwork} from '../../../src/server/cards/prelude/ResearchNetwork';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {testGame} from '../../TestGame';
import {FreyjaBiodomes} from '../../../src/server/cards/venusNext/FreyjaBiodomes';
import {ForestMoon} from '../../../src/server/cards/starwars/ForestMoon';
import {SnowAlgae} from '../../../src/server/cards/promo/SnowAlgae';
import {_EcoLine_} from '../../../src/server/cards/breakthrough/corporation/_EcoLine_';
import {NitrophilicMoss} from '../../../src/server/cards/base/NitrophilicMoss';
import {ViralEnhancers} from '../../../src/server/cards/base/ViralEnhancers';
import {Manutech} from '../../../src/server/cards/venusNext/Manutech';
import {CloneTechnology} from '../../../src/server/cards/eros/CloneTechnology';
import {Greenhouses} from '../../../src/server/cards/base/Greenhouses';
import {DesignedOrganisms} from '../../../src/server/cards/pathfinders/DesignedOrganisms';
import {ScolexIndustries} from '../../../src/server/cards/commission/ScolexIndustries';
import {Lichen} from '../../../src/server/cards/base/Lichen';
import {Moss} from '../../../src/server/cards/base/Moss';
import {Potatoes} from '../../../src/server/cards/promo/Potatoes';


describe('CloneTechnology', () => {
  let card: CloneTechnology;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: ReturnType<typeof testGame>[0];

  beforeEach(() => {
    card = new CloneTechnology();
    [game, player, player2] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });


  it('Cannot play if no plant cards to copy', () => {
    expect(card.canPlay(player)).is.not.true;
  });

  it('Cannot play when production must go down', () => {
    // FreyjaBiodomes needs one unit of energy production
    player.playedCards.push(new FreyjaBiodomes());
    expect(card.canPlay(player)).is.not.true;

    player.production.override({energy: 1});
    expect(card.canPlay(player)).is.true;
  });

  it('Cannot play when any production must go down', () => {
    // FOREST MOON (VI) needs any player to have 2 energy production
    player.playedCards.push(new ForestMoon());
    expect(card.canPlay(player)).is.not.true;

    player2.production.override({energy: 2});
    expect(card.canPlay(player)).is.true;
  });

  it('Should play', () => {
    const noctisFarming = new NoctisFarming();
    player.playedCards.push(noctisFarming);

    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([noctisFarming]);
    expect(player.production.megacredits).to.eq(1);
    expect(player.plants).to.eq(2);
  });

  it('Should work with freyjaBiodomes', () => {
    const freyjaBiodomes = new FreyjaBiodomes();
    const snowAlgae = new SnowAlgae();
    player.playedCards.push(freyjaBiodomes, snowAlgae);

    player.playCard(card);
    runAllActions(game);
    const selectCard2 = cast(player.popWaitingFor(), SelectCard);
    selectCard2.cb([snowAlgae]);

    expect(player.production.plants).to.eq(1);
    expect(player.production.heat).to.eq(1);

    player.production.add(Resource.ENERGY, 1);
    player.playedCards.remove(card);
    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([freyjaBiodomes]);
    expect(player.production.energy).to.eq(0);
    expect(player.production.megacredits).to.eq(2);
  });


  it('Should play with corporation cards', () => {
    const corporationCard = new _EcoLine_();
    player.corporations.push(corporationCard);

    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([corporationCard]);
    runAllActions(game);
    expect(player.production.plants).to.eq(2);
    expect(player.plants).to.eq(3);
  });

  it('Should not work with Solar Wind Power (no plant tag, but has production)', () => {
    player.playedCards.push(new SolarWindPower());

    expect(card.canPlay(player)).is.false;
  });

  it('Should work with Research Network', () => {
    const researchNetwork = new ResearchNetwork();
    player.playedCards.push(researchNetwork);
    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);

    expect(selectCard.cards[0]).eq(researchNetwork);
    expect(player.production.megacredits).to.eq(0);
    selectCard.cb([researchNetwork]);
    expect(player.production.megacredits).to.eq(1);
  });


  it('Should work with NitrophilicMoss', () => {
    const nitrophilicMoss = new NitrophilicMoss();
    player.playedCards.push(nitrophilicMoss);
    expect(card.canPlay(player)).is.false;

    player.stock.plants = 2;
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);

    expect(selectCard.cards[0]).eq(nitrophilicMoss);
    expect(player.production.plants).to.eq(0);
    expect(player.plants).to.eq(2);
    selectCard.cb([nitrophilicMoss]);
    expect(player.production.plants).to.eq(2);
    expect(player.plants).to.eq(0);

    // ViralEnhancers
    const viralEnhancers = new ViralEnhancers;
    player.playedCards.remove(card);
    player.stock.plants = 1;
    player.production.override({plants: 0});
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(viralEnhancers);
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const selectCard2 = cast(player.popWaitingFor(), SelectCard);
    selectCard2.cb([nitrophilicMoss]);
    expect(player.production.plants).to.eq(2);
    expect(player.plants).to.eq(0);

    // Manutech
    player.playedCards.remove(card);
    player.playedCards.remove(viralEnhancers);
    player.stock.plants = 0;
    player.production.override({plants: 0});
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(new Manutech);
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const selectCard3 = cast(player.popWaitingFor(), SelectCard);
    selectCard3.cb([nitrophilicMoss]);
    expect(player.production.plants).to.eq(2);
    expect(player.plants).to.eq(0);
  });


  it('Should work with Greenhouses', () => {
    const greenhouses = new Greenhouses();
    player.playedCards.push(greenhouses);
    expect(card.canPlay(player)).is.true;
    addCity(player, '17');
    addCity(player, '19');
    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards[0]).eq(greenhouses);
    selectCard.cb([greenhouses]);
    expect(player.plants).to.eq(2);
  });


  it('Should work with DesignedOrganisms', () => {
    const designedOrganisms = new DesignedOrganisms();
    player.playedCards.push(designedOrganisms);
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards[0]).eq(designedOrganisms);
    selectCard.cb([designedOrganisms]);
    expect(player.plants).to.eq(3);
    expect(player.production.plants).to.eq(2);
  });


  it('Should work with scolex', () => {
    const scolex = new ScolexIndustries();
    player.playedCards.push(scolex);
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards[0]).eq(scolex);
    selectCard.cb([scolex]);
    expect(player.production.plants).to.eq(1);
    expect(player.production.energy).to.eq(1);
    expect(player.production.steel).to.eq(1);
    expect(player.production.titanium).to.eq(1);
  });

  it('play - 复制 Lichen 的生产力', () => {
    const lichen = new Lichen();
    player.playedCards.push(lichen);
    // Lichen: 生产1植物
    expect(player.production.plants).to.equal(0);
    player.playCard(card);
    runAllActions(game);
    const select = cast(player.popWaitingFor(), SelectCard);
    expect(select.cards.map((c) => c.name)).to.include(lichen.name);
    // 选择 Lichen
    select.cb([lichen]);
    runAllActions(game);
    expect(player.production.plants).to.equal(1);
  });

  it('play - 复制 Moss 的生产力和植物资源', () => {
    const moss = new Moss();
    player.playedCards.push(moss);
    player.plants = 0;
    expect(card.canPlay(player)).is.false;
    player.plants = 1;
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const select = cast(player.popWaitingFor(), SelectCard);
    expect(select.cards.map((c) => c.name)).to.include(moss.name);
    select.cb([moss]);
    runAllActions(game);
    expect(player.production.plants).to.equal(1);
    expect(player.plants).to.equal(0);
  });

  it('play - 复制 Potatoes 的生产力和植物资源', () => {
    const potatoes = new Potatoes();
    player.playedCards.push(potatoes);
    player.plants = 0;
    expect(card.canPlay(player)).is.false;
    player.plants = 2;
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const select = cast(player.popWaitingFor(), SelectCard);
    expect(select.cards.map((c) => c.name)).to.include(potatoes.name);
    select.cb([potatoes]);
    runAllActions(game);
    expect(player.production.plants).to.equal(0);
    expect(player.production.megacredits).to.equal(2);
    expect(player.plants).to.equal(0);
  });

  it('getVictoryPoints 只在打出后获得1分', () => {
    expect(player.getVictoryPoints().victoryPoints).to.equal(0);
    player.playedCards.push(card);
    expect(player.getVictoryPoints().victoryPoints).to.equal(1);
  });
});
