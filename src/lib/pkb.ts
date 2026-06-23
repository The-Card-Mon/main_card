// PokeBucks ($PKB) — loyalty points system
// Earn rate: $1 spent = 10 $PKB
// Redeem rate: 10 $PKB = $1 off

export const PKB_EARN_RATE = 10; // points per $1 spent
export const PKB_REDEEM_RATE = 10; // points needed per $1 discount

export function pkbToUsd(points: number): number {
  return points / PKB_REDEEM_RATE;
}

export function usdToPkb(dollars: number): number {
  return Math.floor(dollars * PKB_EARN_RATE);
}
