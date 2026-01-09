import { colors } from "../theme/colors";

export const MARKER_RADIUS_PX = 20;
export const PIN_VIEWBOX = "0 0 830 1280";
export const PIN_GROUP_TRANSFORM = "translate(0,1280) scale(0.1,-0.1)";

export const PIN_PATH_D =
  "M3855 12789 c-555 -44 -1043 -176 -1530 -414 -1457 -712 -2370 -2223 " +
  "-2322 -3840 19 -605 152 -1155 406 -1680 109 -225 183 -353 331 -575 65 -96 " +
  "856 -1369 1760 -2827 903 -1459 1646 -2653 1650 -2653 4 0 747 1194 1650 2652 " +
  "904 1459 1695 2732 1760 2828 148 222 222 350 331 575 421 869 520 1869 279 " +
  "2821 -244 958 -822 1795 -1640 2371 -696 491 -1551 759 -2404 752 -94 -1 -216 " +
  "-5 -271 -10z m635 -1764 c440 -80 813 -271 1120 -575 769 -761 825 -1980 130 " +
  "-2812 -335 -402 -817 -663 -1344 -728 -114 -14 -378 -14 -492 0 -853 105 " +
  "-1550 715 -1764 1544 -141 545 -52 1136 243 1613 330 531 862 876 1497 968 " +
  "130 19 481 13 610 -10z";

/**
 * Obtiene el color del marcador basado en el nombre de la tienda
 */
export const getMarkerColor = (name: string): string => {
  // Campus principal es transparente
  if (name === "Campus mango y almacén lliçá" || name === "Campus mango y almacen llica") {
    return "transparent";
  }
  return colors.primary.blue;
};
