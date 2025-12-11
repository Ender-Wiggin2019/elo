
describe('EarthCatCult', () => {
  // let card: EarthCatCult;
  // let player: TestPlayer;
  // let game: IGame;

  // beforeEach(() => {
  //   card = new EarthCatCult();
  //   [game, player] = testGame(2);
  //   player.megaCredits = 100;
  // });

  // it('should start with 45 M€ and place a tile', () => {
  //   player.playCorporationCard(card);
  //   runAllActions(game);
  //   expect(card.startingMegaCredits).to.equal(45);
  //   expect(player.getVictoryPoints().victoryPoints).to.equal(0);
  //   // 初始行动应该放置一个生态区域板块
  //   const spaces = game.board.spaces.filter((space) => space.tile?.tileType === TileType.ECOLOGICAL_ZONE);
  //   expect(spaces.length).to.be.at.least(1);
  // });

  // it('should have correct tags and resource type', () => {
  //   expect(card.tags).to.include(Tag.ANIMAL);
  //   expect(card.tags).to.include(Tag.EARTH);
  //   expect(card.resourceType).to.equal(CardResource.ANIMAL);
  // });

  // it('should not be able to act without resources', () => {
  //   player.playCorporationCard(card);
  //   runAllActions(game);
  //   expect(card.canAct()).to.be.false;
  // });

  // it('should be able to act with resources and convert to MC', () => {
  //   player.playCorporationCard(card);
  //   runAllActions(game);
  //   card.resourceCount = 3;
  //   expect(card.canAct()).to.be.true;

  //   const mcBefore = player.stock.get(Resource.MEGACREDITS);
  //   card.action(player);
  //   expect(player.stock.get(Resource.MEGACREDITS)).to.equal(mcBefore + 3);
  // });
});
