// 段位
import {TierName} from './TierName';

export class RankTier {
  constructor(
        public name: TierName,
        public measurement: 'star' | 'value', // 展示方式为星星或者数字
        public maxStars: number,
        public stars: number = 0,
        public value: number = 0,
  ) {
  }
}
