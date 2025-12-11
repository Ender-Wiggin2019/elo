import {expect} from 'chai';
import {Prowler} from '../../../src/server/cards/commission/Prowler';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, cast, setOxygenLevel, setTemperature} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {IGame} from '../../../src/server/IGame';
import {Bushes} from '../../../src/server/cards/base/Bushes';
import {SelectProjectCardToPlay} from '../../../src/server/inputs/SelectProjectCardToPlay';
import {Payment} from '../../../src/common/inputs/Payment';
import {MAX_OXYGEN_LEVEL} from '../../../src/common/constants';

describe('Prowler', () => {
  let card: Prowler;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Prowler();
    [game, player] = testGame(2, {skipInitialShuffling: true});
    player.megaCredits = 100;
  });

  it('初始资金为43 M€和5植物', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    expect(card.startingMegaCredits).to.eq(43);
    expect(player.stock.get(Resource.PLANTS)).to.eq(5);
  });

  it('初始行动应抽2张植物标签卡', () => {
    // 清空手牌以便于测试
    player.cardsInHand = [];

    player.playCorporationCard(card);

    // 手动触发初始行动
    player.defer(card.initialAction(player));
    runAllActions(game);


    // 验证抽了2张卡
    expect(player.cardsInHand.length).to.eq(2);

    // 验证抽到的卡包含植物标签
    const plantTagCards = player.cardsInHand.filter((card) => card.tags.includes(Tag.PLANT));
    expect(plantTagCards.length).to.eq(2);
  });

  it('当有植物和植物标签卡时才能执行行动', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    // 设置1植物和1张植物标签卡
    player.stock.add(Resource.PLANTS, -player.stock.get(Resource.PLANTS));
    player.stock.add(Resource.PLANTS, 1);
    player.cardsInHand = [new Bushes()];
    expect(card.canAct(player)).to.be.true;
  });

  it('当没有植物或没有植物标签卡时不能执行行动', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    player.stock.add(Resource.PLANTS, -player.stock.get(Resource.PLANTS));
    expect(card.canAct(player)).to.be.false;

    player.stock.add(Resource.PLANTS, 1);
    player.cardsInHand = [];
    expect(card.canAct(player)).to.be.false;
  });

  it('行动可以忽略全局参数要求打出植物标签卡', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置全局参数不满足条件
    setOxygenLevel(game, 0);
    setTemperature(game, -24);

    const bushes = new Bushes(); // 需要 -10
    player.cardsInHand = [bushes];
    player.plants = 1;

    // 正常情况下无法打出这张卡
    expect(player.canPlay(bushes)).to.be.false;

    // 使用Prowler行动
    expect(card.canAct(player)).to.be.true;

    // 执行行动并获取选择卡牌的输入
    const selectCard = cast(card.action(player), SelectProjectCardToPlay);

    // 验证可以选择打出该卡
    expect(selectCard.cards).includes(bushes);
    expect(player.stock.get(Resource.PLANTS)).to.eq(0); // 已经花费1植物

    // 选择打出卡牌
    selectCard.payAndPlay(bushes, Payment.of({megaCredits: bushes.cost}));
    runAllActions(game);

    // 验证卡牌已经打出
    expect(player.playedCards.has(bushes.name)).to.be.true;

    // 行动完成后bonus值应重置为0
    expect(card.getGlobalParameterRequirementBonus(player)).to.eq(0);
    expect(card.bonus).to.eq(0);
  });

  it('氧气已满时，放置绿地可以获得额外1TR', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置氧气已满
    setOxygenLevel(game, MAX_OXYGEN_LEVEL);

    // 记录初始TR值
    const initialTR = player.getTerraformRating();

    // 添加足够的植物来放置绿地
    player.stock.add(Resource.PLANTS, 8);

    // 通过标准行动放置绿地
    game.addGreenery(player, game.board.getAvailableSpacesForGreenery(player)[0]);
    runAllActions(game);

    // 验证TR增加了1点
    expect(player.getTerraformRating()).to.eq(initialTR + 1);
  });

  it('氧气未满时，放置绿地不获得额外TR', () => {
    player.playCorporationCard(card);
    runAllActions(game);

    // 设置氧气未满
    setOxygenLevel(game, MAX_OXYGEN_LEVEL - 1);

    // 记录初始TR值
    const initialTR = player.getTerraformRating();

    // 添加足够的植物来放置绿地
    player.stock.add(Resource.PLANTS, 8);

    // 通过标准行动放置绿地
    game.addGreenery(player, game.board.getAvailableSpacesForGreenery(player)[0]);
    runAllActions(game);

    // 验证TR只增加了标准的1点，没有额外的1点
    expect(player.getTerraformRating()).to.eq(initialTR + 1);
  });
});
