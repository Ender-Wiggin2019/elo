import {expect} from 'chai';
import {findRedsPaymentReserve} from '../../src/common/inputs/RedsPayment';

describe('findRedsPaymentReserve', () => {
  it('reserves MC before heat when heat is more valuable to the card', () => {
    const reserve = findRedsPaymentReserve({
      redsCost: 3,
      available: {megacredits: 3, heat: 3, titanium: 0},
      redsRates: {megacredits: 1, heat: 1, titanium: 0},
      cardRates: {megacredits: 1, heat: 2, titanium: 0},
    });

    expect(reserve?.units).deep.eq({megacredits: 3, heat: 0, titanium: 0});
  });

  it('uses Luna titanium for Reds to preserve Geothermal heat', () => {
    const reserve = findRedsPaymentReserve({
      redsCost: 3,
      available: {megacredits: 0, heat: 3, titanium: 2},
      redsRates: {megacredits: 1, heat: 1, titanium: 2},
      cardRates: {megacredits: 1, heat: 2, titanium: 0},
    });

    expect(reserve?.units).deep.eq({megacredits: 0, heat: 0, titanium: 2});
  });
});
