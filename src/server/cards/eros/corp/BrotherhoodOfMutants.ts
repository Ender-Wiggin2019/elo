import {CardRenderer} from '../../render/CardRenderer';
import {Card} from '../../Card';
import {ICard} from '../../ICard';
import {Player} from '../../../Player';
import {SimpleDeferredAction} from '../../../deferredActions/DeferredAction';
import {OrOptions} from '../../../inputs/OrOptions';
import {SelectOption} from '../../../inputs/SelectOption';
import {SelectAmount} from '../../../inputs/SelectAmount';
import {AndOptions} from '../../../inputs/AndOptions';
import {all} from '../../Options';
import {CardName} from '../../../../common/cards/CardName';
import {CardType} from '../../../../common/cards/CardType';
import {Size} from '../../../../common/cards/render/Size';
import {Tag} from '../../../../common/cards/Tag';
import {ICorporationCard} from '../../corporation/ICorporationCard';
import {SerializedCard} from '../../../SerializedCard';

export class BrotherhoodOfMutants extends Card implements ICard, ICorporationCard {
  public isUsed: boolean = false;
  constructor() {
    super({
      name: CardName.BROTHERHOOD_OF_MUTANTS,
      tags: [Tag.WILD],
      startingMegaCredits: 36,
      type: CardType.CORPORATION,

      metadata: {
        cardNumber: 'Q26',
        description: 'You start with 36 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br.br.br;
          b.megacredits(36, {size: Size.TINY});
          b.corpBox('action', (ce) => {
            ce.vSpace(Size.LARGE);
            ce.action('draw cards or gain standard resources equal to your influences', (eb) => {
              eb.empty().startAction.wild(1).text('or').cards(1).slash().influence({amount: 1});
            });
            ce.action('replace all neutral delegates with your delegates, once per game.', (eb) => {
              eb.empty().startAction.minus().delegates(1, {all}).plus().delegates(1);
            });
          });
        }),
      },
    });
  }

  public action(player: Player) {
    if (player.game.turmoil) {
      const bonus = player.game.turmoil.getPlayerInfluence(player);
      player.game.defer(new SimpleDeferredAction(
        player,
        () => {
          return new OrOptions(
            new SelectOption('Draw cards equal to your influences', 'Draw cards', () => {
              player.drawCard(bonus);
              return undefined;
            }),
            new SelectOption('Select resources equal to your influences', 'Select resource', () => {
              player.game.defer(
                new SimpleDeferredAction(player, () => {
                  return this.selectResources(player, bonus);
                }),
              );
              return undefined;
            }),
          );
        },
      ), -1); // Unshift that deferred action
    }
    return undefined;
  }

  public canAct(): boolean {
    return true;
  }

  private selectResources(philaresPlayer: Player, resourceCount: number): AndOptions {
    let megacreditsAmount: number = 0;
    let steelAmount: number = 0;
    let titaniumAmount: number = 0;
    let plantsAmount: number = 0;
    let energyAmount: number = 0;
    let heatAmount: number = 0;

    const selectMegacredit = new SelectAmount('Megacredits', 'Select', (amount: number) => {
      megacreditsAmount = amount;
      return undefined;
    }, 0, resourceCount);
    const selectSteel = new SelectAmount('Steel', 'Select', (amount: number) => {
      steelAmount = amount;
      return undefined;
    }, 0, resourceCount);
    const selectTitanium = new SelectAmount('Titanium', 'Select', (amount: number) => {
      titaniumAmount = amount;
      return undefined;
    }, 0, resourceCount);
    const selectPlants = new SelectAmount('Plants', 'Select', (amount: number) => {
      plantsAmount = amount;
      return undefined;
    }, 0, resourceCount);
    const selectEnergy = new SelectAmount('Energy', 'Select', (amount: number) => {
      energyAmount = amount;
      return undefined;
    }, 0, resourceCount);
    const selectHeat = new SelectAmount('Heat', 'Select', (amount: number) => {
      heatAmount = amount;
      return undefined;
    }, 0, resourceCount);

    const selectResources = new AndOptions(
      () => {
        const selectedResources = megacreditsAmount +
                steelAmount +
                titaniumAmount +
                plantsAmount +
                energyAmount +
                heatAmount;
        if ( selectedResources > resourceCount || selectedResources < resourceCount) {
          throw new Error('Need to select ' + resourceCount + ' resource(s)');
        }
        philaresPlayer.megaCredits += megacreditsAmount;
        philaresPlayer.steel += steelAmount;
        philaresPlayer.titanium += titaniumAmount;
        philaresPlayer.plants += plantsAmount;
        philaresPlayer.energy += energyAmount;
        philaresPlayer.heat += heatAmount;
        return undefined;
      }, selectMegacredit, selectSteel, selectTitanium, selectPlants, selectEnergy, selectHeat);
    selectResources.title = 'Philares effect: select ' + resourceCount + ' resource(s)';

    return selectResources;
  }

  public serialize(serialized: SerializedCard) {
    serialized.isUsed = this.isUsed;
  }

  public deserialize(serialized: SerializedCard) {
    this.isUsed = Boolean(serialized.isUsed);
  }
}

