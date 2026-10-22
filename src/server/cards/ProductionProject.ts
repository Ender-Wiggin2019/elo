import {CardType} from '../../common/cards/CardType';
import {ItemType, isICardRenderItem, isICardRenderRoot, isICardRenderProductionBox, isICardRenderEffect, isICardRenderCorpBoxEffect, isICardRenderCorpBoxAction, isICardRenderCorpBoxEffectAction} from '../../common/cards/render/Types';
import {ICard} from './ICard';

function hasProductionBox(item: ItemType): boolean {
  if (isICardRenderProductionBox(item)) {
    // A crossed-out protection legend (Private Security) does not change production.
    return item.rows.some((row) => row.some((part) => isICardRenderItem(part) && part.cancelled !== true));
  }
  if (isICardRenderRoot(item) || isICardRenderEffect(item) || isICardRenderCorpBoxEffect(item) ||
      isICardRenderCorpBoxAction(item) || isICardRenderCorpBoxEffectAction(item)) {
    return item.rows.some((row) => row.some(hasProductionBox));
  }
  return false;
}

/** Meteoric Aggregates accepts production boxes on project cards, including actions and effects. */
export function isProductionProject(card: ICard): boolean {
  if (![CardType.ACTIVE, CardType.AUTOMATED, CardType.EVENT].includes(card.type)) {
    return false;
  }
  return card.productionBox !== undefined ||
    Object.keys(card.behavior?.production ?? {}).length > 0 ||
    hasProductionBox(card.metadata.renderData);
}
