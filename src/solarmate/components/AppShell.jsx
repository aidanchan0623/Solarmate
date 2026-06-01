import { LogOut, Zap } from 'lucide-react';
import { clearModalBodyState } from './Modal';

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
      <aside className="portal-sidebar">
        <div className="brand-block">
          <div className="logo-mark">
            <Zap size={24} />
          </div>
          <div>
            <strong>SolarMate</strong>
            <span>Smarter Energy, Smarter Connections</span>
          </div>
        </div>

        <div className="role-panel">
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
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <button className="logout-button" type="button" onClick={logout}>
          <LogOut size={17} />
          Logout
        </button>
      </aside>

      <main className="portal-main">
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
