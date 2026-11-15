// German number and date format from DESIGN.md, shared by every page.

const money = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  trailingZeroDisplay: "stripIfInteger",
});

const percent = new Intl.NumberFormat("de-DE", {
  style: "percent",
  maximumFractionDigits: 2,
});

// Intl has no "kilowatt" unit, so the unit is appended.
const decimal = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 });

// Fixed time zone so server and browser render the same day.
const date = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeZone: "Europe/Berlin",
});

export const formatMoney = (euros: number) => money.format(euros);

/** `fraction` as stored for an APR: 0.069 is 6,9 %. */
export const formatPercent = (fraction: number) => percent.format(fraction);

export const formatKw = (kilowatts: number) =>
  `${decimal.format(kilowatts)}\u00a0kW`;

export const formatDate = (value: Date) => date.format(value);
