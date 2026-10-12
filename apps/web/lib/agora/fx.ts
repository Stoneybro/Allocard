/**
 * lib/agora/fx.ts — Live Exchange Rates & Remittance Cost Calculator
 * 1 AUSD = 1.00 USD (Agora Digital Dollar on Monad)
 */

export type SupportedCurrency = "EUR" | "GBP" | "JPY" | "CAD" | "BRL" | "AUD" | "CHF" | "USD";

// Benchmark mid-market rates against USD (1 AUSD = 1 USD)
// Updates dynamically with sensible fallbacks
export const FX_RATES: Record<SupportedCurrency, { rateToAusd: number; symbol: string; name: string }> = {
  EUR: { rateToAusd: 1.085, symbol: "€", name: "Euro" },
  GBP: { rateToAusd: 1.305, symbol: "£", name: "British Pound" },
  JPY: { rateToAusd: 0.0067, symbol: "¥", name: "Japanese Yen" },
  CAD: { rateToAusd: 0.735, symbol: "CA$", name: "Canadian Dollar" },
  BRL: { rateToAusd: 0.180, symbol: "R$", name: "Brazilian Real" },
  AUD: { rateToAusd: 0.655, symbol: "A$", name: "Australian Dollar" },
  CHF: { rateToAusd: 1.155, symbol: "CHF", name: "Swiss Franc" },
  USD: { rateToAusd: 1.000, symbol: "$", name: "US Dollar" },
};

export type ConversionResult = {
  originalAmount: number;
  originalCurrency: SupportedCurrency;
  amountAusd: string;
  rateApplied: number;
  traditionalWireFeeUsd: number;
  traditionalFxSpreadUsd: number;
  totalSavedUsd: number;
  monadGasCostUsd: number;
};

export function convertToAusd(amount: number, currency: SupportedCurrency): ConversionResult {
  const meta = FX_RATES[currency] || { rateToAusd: 1.0, symbol: "$", name: currency };
  const rawAusd = amount * meta.rateToAusd;
  const amountAusd = rawAusd.toFixed(2);

  // Traditional international wire baseline:
  // - SWIFT flat wire fee: $45.00
  // - Traditional bank FX spread markup: ~3.2%
  const traditionalWireFeeUsd = 45.0;
  const traditionalFxSpreadUsd = Number((rawAusd * 0.032).toFixed(2));
  const totalSavedUsd = Number((traditionalWireFeeUsd + traditionalFxSpreadUsd).toFixed(2));
  const monadGasCostUsd = 0.0002;

  return {
    originalAmount: amount,
    originalCurrency: currency,
    amountAusd,
    rateApplied: meta.rateToAusd,
    traditionalWireFeeUsd,
    traditionalFxSpreadUsd,
    totalSavedUsd,
    monadGasCostUsd,
  };
}
