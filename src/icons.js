import { config, icon } from '@fortawesome/fontawesome-svg-core';
import {
  faArrowRight, faArrowUpRightFromSquare, faBolt, faBullseye, faCheck,
  faChessKnight, faCircleInfo, faDownload, faGem, faHandHoldingHeart,
  faMagnifyingGlass, faShieldHalved, faUsers, faWandMagicSparkles, faXmark,
} from '@fortawesome/free-solid-svg-icons';

config.autoAddCss = false;

const icons = {
  arrow: faArrowRight, external: faArrowUpRightFromSquare, spell: faBolt,
  counter: faBullseye, check: faCheck, fighter: faChessKnight, info: faCircleInfo,
  download: faDownload, rune: faGem, support: faHandHoldingHeart,
  search: faMagnifyingGlass, tank: faShieldHalved, heroes: faUsers,
  mage: faWandMagicSparkles, close: faXmark,
};

export const glyph = name => icon(icons[name], {
  attributes: { 'aria-hidden': 'true', focusable: 'false' },
}).html.join('');
