import { LogOut } from 'lucide-react';
import { clearModalBodyState } from './Modal';
import logoUrl from '../../components/logo.svg';

const roleCopy = {
  prosumer: {
    label: 'Prosumer Portal',
    description: 'Export your solar surplus, verify monthly commitments, and track payout performance.'
  },
  consumer: {
    label: 'Consumer Portal',
    description: 'Track credited green energy, TNB imports, savings, and blended bill payment.'
  },
  admin: {
    label: 'Admin Portal',
    description: 'Monitor SolarMate network users, allocation health, transactions, and revenue.'
  }
};

export default function AppShell({
  role,
  userName,
  navItems,
  activeTab,
  onTabChange,
  onLogout,
  children,
  title,
  subtitle
}) {
  const copy = roleCopy[role];
  function changeTab(nextTab) {
    clearModalBodyState();
    onTabChange(nextTab);
  }

  function logout() {
    clearModalBodyState();
    onLogout();
  }

  return (
    <div className={`portal-shell portal-${role}`}>
      <aside
        className={
          role === 'admin'
            ? 'portal-sidebar w-64 bg-slate-900 text-slate-300 border-r border-slate-800 shadow-[4px_0_24px_rgb(0,0,0,0.12)] z-10 flex flex-col'
            : 'portal-sidebar w-64 bg-white border-r border-slate-200 shadow-[4px_0_24px_rgb(0,0,0,0.02)] z-10 flex flex-col'
        }
      >
        <div className="brand-block">
          <div className="logo-mark">
            <img src={logoUrl} alt="SolarMate Logo" />
          </div>
          <div>
            <strong>SolarMate</strong>
            <span>Smarter Energy, Smarter Connections</span>
          </div>
        </div>

        <div className={role === 'admin' ? 'role-panel admin-role-panel' : 'role-panel'}>
          <p className="eyebrow">{copy.label}</p>
          <h2>{userName}</h2>
          <p>{copy.description}</p>
        </div>

        <nav className="portal-nav" aria-label={`${copy.label} navigation`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activeTab === item.id ? 'active' : ''}
                key={item.id}
                type="button"
                onClick={() => changeTab(item.id)}
              >
                <Icon size={18} />
                <span className="text-left leading-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="logout-button" type="button" onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <main className={role === 'admin' ? 'portal-main min-h-screen bg-slate-50 p-8' : 'portal-main'}>
        <header className="portal-header">
          <div>
            <p className="eyebrow">{copy.label}</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="system-chip">Prototype Simulation</div>
        </header>
        {children}
      </main>
    </div>
  );
}
