/**
 * Type declarations for @larchanka/colors-js
 */

declare module "@larchanka/colors-js" {
  type ColorFunction = (text: string) => string;

  interface Colors {
    green: ColorFunction;
    red: ColorFunction;
    yellow: ColorFunction;
    purple: ColorFunction;
    pink: ColorFunction;
    gray: ColorFunction;
    bgGreen: ColorFunction;
    bgRed: ColorFunction;
    bgYellow: ColorFunction;
    bgPurple: ColorFunction;
    bgPink: ColorFunction;
    bgGray: ColorFunction;
  }

  const colors: Colors;
  export default colors;
}
