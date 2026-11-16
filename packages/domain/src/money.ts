// Euros cross the API; cents are stored and calculated with. Rounding happens here only.
export const eurosToCents = (euros: number) => Math.round(euros * 100);
export const centsToEuros = (cents: number) => cents / 100;
