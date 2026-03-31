// ─── Active Market ─────────────────────────────────────────────────────────────
// To switch markets (e.g. for Mexico), replace the import below:
//   import { mxMarket as activeMarket } from './mx'
// No other files need to change — all components consume `activeMarket`.

export { clMarket as activeMarket } from "./cl";
export type { MarketConfig, CapRateTier, AssetClass } from "./cl";
