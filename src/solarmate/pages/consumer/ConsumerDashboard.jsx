import { BarChart3, LayoutDashboard, UserCog, WalletCards } from 'lucide-react';
import { useState } from 'react';
import AppShell from '../../components/AppShell';
import { consumers } from '../../data/mockData';
import { calculateConsumerSavings } from '../../utils/calculations';
import ConsumerAccount from './ConsumerAccount';
import ConsumerGreenCreditWallet from './ConsumerGreenCreditWallet';
import ConsumerOverview from './ConsumerOverview';
import ConsumerUsageConsumption from './ConsumerUsageConsumption';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'usage', label: 'Usage & Consumption', icon: BarChart3 },
  { id: 'wallet', label: 'Energy Wallet', icon: WalletCards },
  { id: 'account', label: 'Account / Manage Package', icon: UserCog }
];

const pages = {
  overview: {
    title: 'Track Your Green Energy Credit',
    subtitle: 'See your package, credited green energy, total usage, and savings.',
    component: ConsumerOverview
  },
  usage: {
    title: 'Usage & Consumption',
    subtitle: 'Review weekly consumption and monthly bill totals from the same backend meter records.',
    component: ConsumerUsageConsumption
  },
  wallet: {
    title: 'Energy Wallet',
    subtitle: 'Top up, pay the current bill, download statements, and review transaction history.',
    component: ConsumerGreenCreditWallet
  },
  account: {
    title: 'Account / Manage Package',
    subtitle: 'Review account details and update your green energy package.',
    component: ConsumerAccount
  }
};

const usageByAllocation = {
  300: { totalUsage: 360, greenCredit: 300 },
  1000: { totalUsage: 1200, greenCredit: 1000 },
  2000: { totalUsage: 2400, greenCredit: 2000 }
};

function usageForAllocation(allocation, fallbackConsumer) {
  if (usageByAllocation[allocation]) return usageByAllocation[allocation];
  const totalUsage = Math.max(allocation * 1.15, fallbackConsumer.totalEnergyUsedThisMonth, allocation || 0);
  return {
    totalUsage,
    greenCredit: Math.min(allocation || fallbackConsumer.energyCreditedThisMonth, totalUsage)
  };
}

export default function ConsumerDashboard({ username, onLogout, onProfileUpdate, user, profile }) {
  const [activeTab, setActiveTab] = useState('overview');
  const page = pages[activeTab];
  const Page = page.component;
  const mockConsumer = consumers[0];
  const monthlyGreenAllocation = profile?.package_allocation_kwh || mockConsumer.monthlyGreenAllocation;
  const usage = usageForAllocation(monthlyGreenAllocation, mockConsumer);
  const consumer = {
    ...mockConsumer,
    name: profile?.business_name || mockConsumer.name,
    businessType: profile?.business_type || mockConsumer.businessType,
    selectedPackage: profile?.selected_package || mockConsumer.selectedPackage,
    monthlyGreenAllocation,
    energyCreditedThisMonth: usage.greenCredit,
    totalEnergyUsedThisMonth: usage.totalUsage,
    estimatedSavings: calculateConsumerSavings(usage.totalUsage, usage.greenCredit).savings
  };

  return (
    <AppShell
      activeTab={activeTab}
      navItems={navItems}
      onLogout={onLogout}
      onTabChange={setActiveTab}
      role="consumer"
      subtitle={page.subtitle}
      title={page.title}
      userName={consumer.name || username}
    >
      <Page consumer={consumer} onProfileUpdate={onProfileUpdate} profile={profile} user={user} />
    </AppShell>
  );
}
