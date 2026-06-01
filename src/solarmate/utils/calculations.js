export const SOLAR_ATAP_REFERENCE_RATE = 0.2703;

export const TNB_PEAK_ENERGY_CHARGE = 0.2852;
export const TNB_CAPACITY_CHARGE = 0.0883;
export const TNB_NETWORK_CHARGE = 0.1482;
export const TNB_RETAIL_CHARGE = 20.0;
export const TNB_PEAK_TOTAL_RATE = 0.5217;

export const SOLARMATE_RATE = 0.43;
export const PROSUMER_BUYBACK_RATE = 0.33;
export const GRID_TOLL_RATE = 0.09;
export const PLATFORM_SPREAD_RATE = 0.01;

// Backward-compatible aliases for older components.
export const TNB_NDLV_ENERGY_CHARGE = TNB_PEAK_ENERGY_CHARGE;
export const TNB_NDLV_CAPACITY_CHARGE = TNB_CAPACITY_CHARGE;
export const TNB_NDLV_NETWORK_CHARGE = TNB_NETWORK_CHARGE;
export const TNB_NDLV_RETAIL_CHARGE = TNB_RETAIL_CHARGE;
export const TNB_NDLV_TOTAL_VARIABLE_RATE = TNB_PEAK_TOTAL_RATE;
export const TNB_REFERENCE_RATE = TNB_PEAK_TOTAL_RATE;

function money(value) {
  return Number((Number(value) || 0).toFixed(2));
}

function oneDecimal(value) {
  return Number((Number(value) || 0).toFixed(1));
}

function fourDecimals(value) {
  return Number((Number(value) || 0).toFixed(4));
}

function percentage(value) {
  const numeric = Number(value) || 0;
  return Math.trunc(numeric * 100) / 100;
}

export function calculatePower(voltage, current) {
  return oneDecimal(Number(voltage) * Number(current));
}

export function calculateSurplus(generatedPower, loadPower) {
  return oneDecimal(Math.max(Number(generatedPower) - Number(loadPower), 0));
}

export function calculateProsumerEarnings(exportedKWh) {
  return money(Number(exportedKWh) * PROSUMER_BUYBACK_RATE);
}

export function calculateSolarAtapEquivalent(exportedKWh) {
  return money(Number(exportedKWh) * SOLAR_ATAP_REFERENCE_RATE);
}

export function calculateProsumerExtraEarnings(exportedKWh) {
  const solarMateEarnings = calculateProsumerEarnings(exportedKWh);
  const solarAtapEquivalent = calculateSolarAtapEquivalent(exportedKWh);
  const extraEarnings = money(solarMateEarnings - solarAtapEquivalent);
  const upliftPercentage = percentage(
    ((PROSUMER_BUYBACK_RATE - SOLAR_ATAP_REFERENCE_RATE) / SOLAR_ATAP_REFERENCE_RATE) * 100
  );

  return {
    solarMateEarnings,
    solarAtapEquivalent,
    extraEarnings,
    upliftPercentage
  };
}

export function calculateProsumerUpliftPercentage() {
  if (SOLAR_ATAP_REFERENCE_RATE <= 0) return 0;
  return percentage(((PROSUMER_BUYBACK_RATE - SOLAR_ATAP_REFERENCE_RATE) / SOLAR_ATAP_REFERENCE_RATE) * 100);
}

export function calculateProsumerSplitExport(actualExportedKWh, quotaKWh) {
  const actualExported = Math.max(Number(actualExportedKWh) || 0, 0);
  const quota = Math.max(Number(quotaKWh) || 0, 0);

  return {
    solarMateKWh: oneDecimal(Math.min(actualExported, quota)),
    solarAtapKWh: oneDecimal(Math.max(actualExported - quota, 0))
  };
}

export function calculateProsumerTotalEarnings(actualExportedKWh, quotaKWh) {
  const split = calculateProsumerSplitExport(actualExportedKWh, quotaKWh);
  const solarMateEarnings = money(split.solarMateKWh * PROSUMER_BUYBACK_RATE);
  const solarAtapEarnings = money(split.solarAtapKWh * SOLAR_ATAP_REFERENCE_RATE);

  return {
    ...split,
    solarMateEarnings,
    solarAtapEarnings,
    totalEarnings: money(solarMateEarnings + solarAtapEarnings)
  };
}

export function checkProsumerEligibility(estimatedSurplus, commitment) {
  return Number(estimatedSurplus) >= Number(commitment) * 1.2;
}

export function calculateAllocationRatio(totalAvailableExport, totalSubscribedDemand) {
  if (Number(totalSubscribedDemand) <= 0) return 0;
  return fourDecimals(Number(totalAvailableExport) / Number(totalSubscribedDemand));
}

export function calculateMatchedRate(matchedEnergy, exportedEnergy) {
  if (Number(exportedEnergy) <= 0) return 0;
  return percentage((Number(matchedEnergy) / Number(exportedEnergy)) * 100);
}

export function calculateCreditedEnergy(packageAllocation, allocationRatio) {
  const requestedCredit = Number(packageAllocation) * Number(allocationRatio);
  return oneDecimal(Math.min(requestedCredit, Number(packageAllocation)));
}

export function calculateImportedEnergy(totalUsageKWh, creditedEnergyKWh) {
  return oneDecimal(Math.max(Number(totalUsageKWh) - Number(creditedEnergyKWh), 0));
}

export function calculateTnbVariableRate() {
  return fourDecimals(TNB_PEAK_ENERGY_CHARGE + TNB_CAPACITY_CHARGE + TNB_NETWORK_CHARGE);
}

export function calculateTnbOnlyBill(totalUsageKWh) {
  return money(Number(totalUsageKWh) * TNB_PEAK_TOTAL_RATE + TNB_RETAIL_CHARGE);
}

export function calculateSolarMatePortion(creditedEnergyKWh) {
  return money(Number(creditedEnergyKWh) * SOLARMATE_RATE);
}

export function calculateTnbPortion(importedEnergyKWh) {
  return money(Number(importedEnergyKWh) * TNB_PEAK_TOTAL_RATE);
}

export function calculateSolarMateBlendedBill(totalUsageKWh, creditedEnergyKWh) {
  const safeCredit = Math.min(Number(creditedEnergyKWh), Number(totalUsageKWh));
  const importedEnergy = calculateImportedEnergy(totalUsageKWh, safeCredit);
  const solarMatePortion = calculateSolarMatePortion(safeCredit);
  const tnbImportPortion = calculateTnbPortion(importedEnergy);
  const retailCharge = TNB_RETAIL_CHARGE;
  const totalPayable = money(solarMatePortion + tnbImportPortion + retailCharge);

  return {
    totalUsage: Number(totalUsageKWh),
    creditedEnergy: safeCredit,
    importedEnergy,
    solarMatePortion,
    tnbImportPortion,
    tnbPortion: tnbImportPortion,
    retailCharge,
    totalPayable
  };
}

export function calculateTotalBill(totalUsageKWh, creditedEnergyKWh) {
  return calculateSolarMateBlendedBill(totalUsageKWh, creditedEnergyKWh).totalPayable;
}

export function calculateConsumerSavings(totalUsageKWh, creditedEnergyKWh) {
  const tnbOnlyBill = calculateTnbOnlyBill(totalUsageKWh);
  const blendedBill = calculateSolarMateBlendedBill(totalUsageKWh, creditedEnergyKWh).totalPayable;
  const savings = money(tnbOnlyBill - blendedBill);
  const savingsPercentage = calculateActualBillSavingPercentage(totalUsageKWh, creditedEnergyKWh);

  return {
    tnbOnlyBill,
    blendedBill,
    savings,
    savingsPercentage
  };
}

export function calculateActualBillSavingPercentage(totalUsageKWh, creditedEnergyKWh) {
  const tnbOnlyBill = calculateTnbOnlyBill(totalUsageKWh);
  if (tnbOnlyBill <= 0) return 0;
  const blendedBill = calculateSolarMateBlendedBill(totalUsageKWh, creditedEnergyKWh).totalPayable;
  return percentage(((tnbOnlyBill - blendedBill) / tnbOnlyBill) * 100);
}

export function calculateSavings(totalUsageKWh, creditedEnergyKWh) {
  return calculateConsumerSavings(totalUsageKWh, creditedEnergyKWh).savings;
}

export function calculateRateDiscount() {
  const rateDiscount = fourDecimals(TNB_PEAK_TOTAL_RATE - SOLARMATE_RATE);
  const rateDiscountPercentage = percentage((rateDiscount / TNB_PEAK_TOTAL_RATE) * 100);

  return {
    rateDiscount,
    rateDiscountPercentage
  };
}

export function calculateProsumerPayout(creditedEnergyKWh) {
  return money(Number(creditedEnergyKWh) * PROSUMER_BUYBACK_RATE);
}

export function calculateGridToll(creditedEnergyKWh) {
  return money(Number(creditedEnergyKWh) * GRID_TOLL_RATE);
}

export function calculatePlatformRevenue(creditedEnergyKWh) {
  return money(Number(creditedEnergyKWh) * PLATFORM_SPREAD_RATE);
}

export function calculateSettlementBreakdown(creditedEnergyKWh) {
  return {
    prosumerPayout: calculateProsumerPayout(creditedEnergyKWh),
    gridToll: calculateGridToll(creditedEnergyKWh),
    platformRevenue: calculatePlatformRevenue(creditedEnergyKWh)
  };
}

export function calculateSolarMateCost(kWh) {
  return calculateSolarMatePortion(kWh);
}

export function calculateTnbCost(kWh) {
  return calculateTnbPortion(kWh);
}

export function calculateBlendedBill(totalUsageKWh, creditedEnergyKWh) {
  const bill = calculateSolarMateBlendedBill(totalUsageKWh, creditedEnergyKWh);
  const savings = calculateConsumerSavings(totalUsageKWh, creditedEnergyKWh);

  return {
    solarMateAllocation: bill.creditedEnergy,
    creditedEnergy: bill.creditedEnergy,
    remainingTnbKwh: bill.importedEnergy,
    importedEnergy: bill.importedEnergy,
    solarMatePortion: bill.solarMatePortion,
    tnbPortion: bill.tnbImportPortion,
    tnbImportPortion: bill.tnbImportPortion,
    retailCharge: bill.retailCharge,
    blendedBill: bill.totalPayable,
    totalPayable: bill.totalPayable,
    tnbOnlyBill: savings.tnbOnlyBill,
    savings: savings.savings,
    savingsPercentage: savings.savingsPercentage
  };
}
