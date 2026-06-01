import { Activity, LayoutDashboard, UserCog, WalletCards } from 'lucide-react';
import { useState } from 'react';
import AppShell from '../../components/AppShell';
import { prosumers } from '../../data/mockData';
import { calculateProsumerTotalEarnings } from '../../utils/calculations';
import ProsumerAccount from './ProsumerAccount';
import ProsumerEnergyWallet from './ProsumerEnergyWallet';
import ProsumerExports from './ProsumerExports';
import ProsumerOverview from './ProsumerOverview';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'exports', label: 'Exports', icon: Activity },
  { id: 'wallet', label: 'Energy Wallet', icon: WalletCards },
  { id: 'account', label: 'Account / Manage Plan', icon: UserCog }
];

const pages = {
  overview: {
    title: 'Export Your Solar Surplus',
    subtitle: 'Track monthly commitment, verified exports, earnings, and reliability.',
    component: ProsumerOverview
  },
  exports: {
    title: 'Exports',
    subtitle: 'Review weekly export trends and monthly SolarMate/Solar ATAP earnings in one place.',
    component: ProsumerExports
  },
  wallet: {
    title: 'SolarMate Energy Wallet',
    subtitle: 'Track verified export earnings, SolarMate quota payout, Solar ATAP excess, and cashout status.',
    component: ProsumerEnergyWallet
  },
  account: {
    title: 'Account / Manage Plan',
    subtitle: 'Review account details and update your export commitment.',
    component: ProsumerAccount
  }
};

export default function ProsumerDashboard({ username, onLogout, onProfileUpdate, user, profile }) {
  const [activeTab, setActiveTab] = useState('overview');
  const page = pages[activeTab];
  const Page = page.component;
  const mockProsumer = prosumers[0];
  const exportedThisMonth = mockProsumer.exportedThisMonth;
  const prosumer = {
    ...mockProsumer,
    name: profile?.display_name || mockProsumer.name,
    selectedPlan: profile?.selected_export_plan || mockProsumer.selectedPlan,
    monthlyExportCommitment: profile?.export_commitment_kwh || mockProsumer.monthlyExportCommitment,
    deviceId: profile?.device_id || null,
    estimatedEarnings: calculateProsumerTotalEarnings(
      exportedThisMonth,
      profile?.export_commitment_kwh || mockProsumer.monthlyExportCommitment
    ).totalEarnings,
    cashout: {
      ...(mockProsumer.cashout || {}),
      availableBalance:
        typeof profile?.cashout_balance === 'number'
          ? profile.cashout_balance
          : mockProsumer.cashout?.availableBalance ??
            calculateProsumerTotalEarnings(
              exportedThisMonth,
              profile?.export_commitment_kwh || mockProsumer.monthlyExportCommitment
            ).totalEarnings
    }
  };

  return (
    <AppShell
      activeTab={activeTab}
      navItems={navItems}
      onLogout={onLogout}
      onTabChange={setActiveTab}
      role="prosumer"
      subtitle={page.subtitle}
      title={page.title}
      userName={prosumer.name || username}
    >
      <Page onProfileUpdate={onProfileUpdate} profile={profile} prosumer={prosumer} user={user} />
    </AppShell>
  );
}
