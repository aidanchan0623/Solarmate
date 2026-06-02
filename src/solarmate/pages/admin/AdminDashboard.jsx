import { ArrowLeftRight, BadgeDollarSign, CloudSun, History, LayoutDashboard, ReceiptText, Users } from 'lucide-react';
import { useState } from 'react';
import AppShell from '../../components/AppShell';
import AdminExportHistory from './AdminExportHistory';
import AdminGridIntelligence from './AdminGridIntelligence';
import AdminOverview from './AdminOverview';
import AdminRevenue from './AdminRevenue';
import AdminSupplyDemand from './AdminSupplyDemand';
import AdminTransactions from './AdminTransactions';
import AdminUsers from './AdminUsers';

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'supply-demand', label: 'Supply & Demand', icon: ArrowLeftRight },
  { id: 'grid-intelligence', label: 'Grid Intelligence', icon: CloudSun },
  { id: 'transactions', label: 'Transactions', icon: ReceiptText },
  { id: 'export-history', label: 'Monthly Export Records', icon: History },
  { id: 'revenue', label: 'Revenue', icon: BadgeDollarSign }
];

const pages = {
  overview: {
    title: 'Monitor SolarMate Network',
    subtitle: 'Track platform-wide supply, demand, matched energy, payouts, and revenue.',
    component: AdminOverview
  },
  users: {
    title: 'Users',
    subtitle: 'Manage prosumers and low-voltage business consumers in one table.',
    component: AdminUsers
  },
  'supply-demand': {
    title: 'Supply & Demand',
    subtitle: 'Review allocation health and matching performance.',
    component: AdminSupplyDemand
  },
  'grid-intelligence': {
    title: 'Grid Intelligence',
    subtitle: 'Weather-based solar forecasting and TNB fallback advisory.',
    component: AdminGridIntelligence
  },
  transactions: {
    title: 'Transactions',
    subtitle: 'Audit bill payments, credited energy, payout, and platform revenue.',
    component: AdminTransactions
  },
  'export-history': {
    title: 'Monthly Export Records',
    subtitle: 'Review monthly prosumer export commitments, actual export, and payout status.',
    component: AdminExportHistory
  },
  revenue: {
    title: 'Revenue',
    subtitle: 'Track platform spread revenue and projected monthly performance.',
    component: AdminRevenue
  }
};

export default function AdminDashboard({ username, onLogout, user }) {
  const [activeTab, setActiveTab] = useState('overview');
  const page = pages[activeTab];
  const Page = page.component;

  return (
    <AppShell
      activeTab={activeTab}
      navItems={navItems}
      onLogout={onLogout}
      onTabChange={setActiveTab}
      role="admin"
      subtitle={page.subtitle}
      title={page.title}
      userName={username || 'SolarMate Admin'}
    >
      <Page user={user} />
    </AppShell>
  );
}
