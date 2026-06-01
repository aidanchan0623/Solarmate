export const packagePlans = {
  prosumer: [
    {
      id: 'starter-export',
      name: 'Starter Export',
      commitment: '100 kWh/month',
      monthlyCommitment: 100,
      rate: 0.33,
      expectedEarning: 33,
      expectedPayout: 'RM33.00/month',
      suitableFor: 'Small rooftop solar users',
      label: 'Starter'
    },
    {
      id: 'standard-export',
      name: 'Standard Export',
      commitment: '300 kWh/month',
      monthlyCommitment: 300,
      rate: 0.33,
      expectedEarning: 99,
      expectedPayout: 'RM99.00/month',
      suitableFor: 'Medium rooftop solar users',
      label: 'Recommended',
      recommended: true
    },
    {
      id: 'premium-export',
      name: 'Premium Export',
      commitment: '500 kWh/month',
      monthlyCommitment: 500,
      rate: 0.33,
      expectedEarning: 165,
      expectedPayout: 'RM165.00/month',
      suitableFor: 'High-surplus rooftop solar users',
      label: 'High Export'
    }
  ],
  consumer: [
    {
      id: 'lite-business',
      name: 'Lite Business',
      allocation: '300 kWh/month',
      monthlyAllocation: 300,
      rate: 0.43,
      monthlyCost: 129,
      suitableFor: 'Small shop, kiosk, small office',
      availability: 'Available',
      label: 'Lite'
    },
    {
      id: 'business',
      name: 'Business',
      allocation: '1,000 kWh/month',
      monthlyAllocation: 1000,
      rate: 0.43,
      monthlyCost: 430,
      suitableFor: 'Cafe, clinic, mini market, office',
      availability: 'Limited slots',
      label: 'Recommended',
      recommended: true
    },
    {
      id: 'business-plus',
      name: 'Business Plus',
      allocation: '2,000 kWh/month',
      monthlyAllocation: 2000,
      rate: 0.43,
      monthlyCost: 860,
      suitableFor: 'Restaurant, larger shoplot, small workshop',
      availability: 'Depends on local prosumer supply',
      label: 'High Usage'
    }
  ]
};

export const prosumers = [
  {
    id: 'P001',
    name: 'House A Solar',
    systemStatus: 'Active',
    selectedPlan: 'Standard Export',
    monthlyExportCommitment: 300,
    exportedThisMonth: 620,
    estimatedEarnings: 197.44,
    reliabilityScore: 94,
    joinedDate: '2026-01-12',
    cashout: {
      availableBalance: 59.4,
      pendingSettlement: 10.75,
      lastCashoutDate: '30 April 2026',
      method: 'Bank Transfer',
      status: 'Available'
    }
  },
  {
    id: 'P002',
    name: 'Kedai Rooftop Array',
    systemStatus: 'Active',
    selectedPlan: 'Premium Export',
    monthlyExportCommitment: 500,
    exportedThisMonth: 240,
    estimatedEarnings: 79.2,
    reliabilityScore: 91,
    joinedDate: '2026-02-04'
  },
  {
    id: 'P003',
    name: 'Terrace B Solar',
    systemStatus: 'Pending Review',
    selectedPlan: 'Starter Export',
    monthlyExportCommitment: 100,
    exportedThisMonth: 52,
    estimatedEarnings: 17.16,
    reliabilityScore: 88,
    joinedDate: '2026-03-19'
  }
];

export const consumers = [
  {
    id: 'C001',
    name: 'Green Bean Cafe',
    businessType: 'Cafe',
    selectedPackage: 'Business',
    monthlyGreenAllocation: 1000,
    energyCreditedThisMonth: 472,
    totalEnergyUsedThisMonth: 1000,
    estimatedSavings: 43.28,
    paymentStatus: 'Pending',
    joinedDate: '2026-01-28'
  },
  {
    id: 'C002',
    name: 'Klinik Seri Suria',
    businessType: 'Clinic',
    selectedPackage: 'Business',
    monthlyGreenAllocation: 1000,
    energyCreditedThisMonth: 510,
    totalEnergyUsedThisMonth: 1120,
    estimatedSavings: 35.7,
    paymentStatus: 'Paid',
    joinedDate: '2026-02-17'
  },
  {
    id: 'C003',
    name: 'Mini Market Taman Jaya',
    businessType: 'Mini market',
    selectedPackage: 'Business Plus',
    monthlyGreenAllocation: 2000,
    energyCreditedThisMonth: 690,
    totalEnergyUsedThisMonth: 1460,
    estimatedSavings: 48.3,
    paymentStatus: 'Pending',
    joinedDate: '2026-03-03'
  }
];

export const prosumerDailyTracking = {
  generatedToday: 18.4,
  localConsumptionToday: 9.6,
  exportedToday: 8.8,
  exportValueToday: 2.9,
  instantSurplusKw: 1.2,
  deviceStatus: 'Online'
};

export const dailyExportTrend = [
  { date: 'May 23', generatedKwh: 17.8, localConsumptionKwh: 9.2, exportedKwh: 8.6 },
  { date: 'May 24', generatedKwh: 18.9, localConsumptionKwh: 10.1, exportedKwh: 8.8 },
  { date: 'May 25', generatedKwh: 16.5, localConsumptionKwh: 8.7, exportedKwh: 7.8 },
  { date: 'May 26', generatedKwh: 19.2, localConsumptionKwh: 9.9, exportedKwh: 9.3 },
  { date: 'May 27', generatedKwh: 18.1, localConsumptionKwh: 9.4, exportedKwh: 8.7 },
  { date: 'May 28', generatedKwh: 17.6, localConsumptionKwh: 9.1, exportedKwh: 8.5 },
  { date: 'May 29', generatedKwh: 18.4, localConsumptionKwh: 9.6, exportedKwh: 8.8 }
];

export const monthlyExportHistory = [
  { month: 'January 2026', prosumerId: 'P001', commitmentKwh: 500, totalGeneratedKwh: 780, totalLocalConsumptionKwh: 260, totalExportedKwh: 520, earnings: 170.41, status: 'Settled' },
  { month: 'February 2026', prosumerId: 'P001', commitmentKwh: 500, totalGeneratedKwh: 740, totalLocalConsumptionKwh: 260, totalExportedKwh: 480, earnings: 158.4, status: 'Settled' },
  { month: 'March 2026', prosumerId: 'P001', commitmentKwh: 500, totalGeneratedKwh: 890, totalLocalConsumptionKwh: 280, totalExportedKwh: 610, earnings: 194.73, status: 'Settled' },
  { month: 'April 2026', prosumerId: 'P001', commitmentKwh: 500, totalGeneratedKwh: 810, totalLocalConsumptionKwh: 280, totalExportedKwh: 530, earnings: 173.11, status: 'Settled' },
  { month: 'May 2026', prosumerId: 'P001', commitmentKwh: 500, totalGeneratedKwh: 920, totalLocalConsumptionKwh: 300, totalExportedKwh: 620, earnings: 197.44, status: 'Pending' }
];

export const consumerLiveMeter = {
  currentLoadPower: 3.8,
  energyUsedToday: 42.6,
  tnbImportToday: 31.2,
  greenCreditUsedToday: 11.4,
  remainingGreenCredit: 528,
  smartMeterStatus: 'Online',
  lastUpdated: 'Just now'
};

export const consumerUsageTrend = [
  { time: '8 AM', totalUsage: 5.8, greenCredit: 1.8, tnbImport: 4.0 },
  { time: '10 AM', totalUsage: 12.4, greenCredit: 3.9, tnbImport: 8.5 },
  { time: '12 PM', totalUsage: 21.7, greenCredit: 6.4, tnbImport: 15.3 },
  { time: '2 PM', totalUsage: 29.9, greenCredit: 8.2, tnbImport: 21.7 },
  { time: '4 PM', totalUsage: 36.3, greenCredit: 10.1, tnbImport: 26.2 },
  { time: '6 PM', totalUsage: 42.6, greenCredit: 11.4, tnbImport: 31.2 }
];

export const energyCreditSimulation = {
  totalAvailableProsumerExport: 360000,
  totalSubscribedConsumerDemand: 360000,
  consumerPackageAllocation: 1000,
  creditedEnergy: 472,
  totalConsumerUsage: 1000
};

export const billingSimulation = {
  customerName: 'Green Bean Cafe',
  billingMonth: 'May 2026',
  totalUsage: 1000,
  creditedEnergy: 472,
  importedEnergy: 528,
  paymentStatus: 'Pending'
};

export const usageHistory = [
  { date: '2026-05-23', totalUsageKwh: 39.8, greenCreditUsedKwh: 10.4, tnbImportKwh: 29.4, estimatedSavings: 0.73, status: 'Posted' },
  { date: '2026-05-24', totalUsageKwh: 42.1, greenCreditUsedKwh: 11.2, tnbImportKwh: 30.9, estimatedSavings: 0.78, status: 'Posted' },
  { date: '2026-05-25', totalUsageKwh: 41.6, greenCreditUsedKwh: 10.8, tnbImportKwh: 30.8, estimatedSavings: 0.76, status: 'Posted' },
  { date: '2026-05-26', totalUsageKwh: 44.3, greenCreditUsedKwh: 12.1, tnbImportKwh: 32.2, estimatedSavings: 0.85, status: 'Posted' },
  { date: '2026-05-27', totalUsageKwh: 40.9, greenCreditUsedKwh: 10.6, tnbImportKwh: 30.3, estimatedSavings: 0.74, status: 'Posted' },
  { date: '2026-05-28', totalUsageKwh: 43.7, greenCreditUsedKwh: 11.8, tnbImportKwh: 31.9, estimatedSavings: 0.83, status: 'Posted' },
  { date: '2026-05-29', totalUsageKwh: 42.6, greenCreditUsedKwh: 11.4, tnbImportKwh: 31.2, estimatedSavings: 0.8, status: 'Live estimate' }
];

export const consumerMonthlyUsageHistory = [
  {
    month: 'January 2026',
    totalUsage: 2450,
    greenCredit: 1800,
    tnbImport: 650,
    paymentStatus: 'Paid'
  },
  {
    month: 'February 2026',
    totalUsage: 2520,
    greenCredit: 1900,
    tnbImport: 620,
    paymentStatus: 'Paid'
  },
  {
    month: 'March 2026',
    totalUsage: 2610,
    greenCredit: 2000,
    tnbImport: 610,
    paymentStatus: 'Paid'
  },
  {
    month: 'April 2026',
    totalUsage: 2700,
    greenCredit: 2000,
    tnbImport: 700,
    paymentStatus: 'Paid'
  },
  {
    month: 'May 2026',
    totalUsage: 2700,
    greenCredit: 2000,
    tnbImport: 700,
    paymentStatus: 'Pending'
  }
];

export const transactions = [
  {
    id: 'TXN-1001',
    date: '2026-05-02',
    consumer: 'Klinik Seri Suria',
    creditedEnergy: 510,
    totalBill: 561.54,
    prosumerPayout: 168.3,
    platformRevenue: 5.1,
    paymentStatus: 'Paid'
  },
  {
    id: 'TXN-1002',
    date: '2026-05-08',
    consumer: 'Green Bean Cafe',
    creditedEnergy: 472,
    totalBill: 498.42,
    prosumerPayout: 155.76,
    platformRevenue: 4.72,
    paymentStatus: 'Pending'
  },
  {
    id: 'TXN-1003',
    date: '2026-05-14',
    consumer: 'Mini Market Taman Jaya',
    creditedEnergy: 690,
    totalBill: 705.32,
    prosumerPayout: 227.7,
    platformRevenue: 6.9,
    paymentStatus: 'Pending'
  },
  {
    id: 'TXN-1004',
    date: '2026-05-20',
    consumer: 'Bengkel Cahaya Auto',
    creditedEnergy: 860,
    totalBill: 856.18,
    prosumerPayout: 283.8,
    platformRevenue: 8.6,
    paymentStatus: 'Paid'
  },
  {
    id: 'TXN-1005',
    date: '2026-05-26',
    consumer: 'Restoran Seri Hijau',
    creditedEnergy: 1200,
    totalBill: 1182.42,
    prosumerPayout: 396,
    platformRevenue: 12,
    paymentStatus: 'Pending'
  }
];

export const adminMetrics = {
  totalUsers: 2001,
  totalProsumers: 1200,
  totalConsumers: 800,
  totalExportedEnergy: 360000,
  totalImportedEnergy: 0,
  totalMatchedEnergy: 360000,
  matchingRate: 100,
  totalSolarMateRevenue: 3600,
  totalProsumerPayout: 118800,
  totalGridToll: 32400,
  totalConsumerBillSavings: 33012,
  systemStatus: 'Active',
  totalConsumerDemand: 360000,
  unmatchedSupply: 0,
  unmatchedDemand: 0,
  projectedMonthlyRevenue: 3600
};

export const supplyDemandTrend = [
  { month: 'Jan', supply: 285000, demand: 335000, matched: 285000, import: 540000 },
  { month: 'Feb', supply: 305000, demand: 358000, matched: 305000, import: 565000 },
  { month: 'Mar', supply: 321000, demand: 380000, matched: 321000, import: 590000 },
  { month: 'Apr', supply: 343000, demand: 402000, matched: 343000, import: 605000 },
  { month: 'May', supply: 360000, demand: 420000, matched: 360000, import: 620000 }
];

export const revenueByMonth = [
  { month: 'Jan', matchedKwh: 285000, revenue: 2850 },
  { month: 'Feb', matchedKwh: 305000, revenue: 3050 },
  { month: 'Mar', matchedKwh: 321000, revenue: 3210 },
  { month: 'Apr', matchedKwh: 343000, revenue: 3430 },
  { month: 'May', matchedKwh: 360000, revenue: 3600 }
];

export const users = [
  { id: 'P001', name: 'House A Solar', role: 'Prosumer', packagePlan: 'Standard Export', status: 'Active', joinedDate: '2026-01-12' },
  { id: 'P002', name: 'Kedai Rooftop Array', role: 'Prosumer', packagePlan: 'Premium Export', status: 'Active', joinedDate: '2026-02-04' },
  { id: 'P003', name: 'Terrace B Solar', role: 'Prosumer', packagePlan: 'Starter Export', status: 'Pending Review', joinedDate: '2026-03-19' },
  { id: 'C001', name: 'Green Bean Cafe', role: 'Consumer', packagePlan: 'Business', status: 'Active', joinedDate: '2026-01-28' },
  { id: 'C002', name: 'Klinik Seri Suria', role: 'Consumer', packagePlan: 'Business', status: 'Active', joinedDate: '2026-02-17' },
  { id: 'C003', name: 'Mini Market Taman Jaya', role: 'Consumer', packagePlan: 'Business Plus', status: 'Active', joinedDate: '2026-03-03' }
];
