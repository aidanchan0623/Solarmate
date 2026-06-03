import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  KeyRound,
  Network,
  ShieldCheck,
  Sparkles,
  SunMedium,
  UserPlus
} from 'lucide-react';
import logoUrl from '../../components/logo.svg';
import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';

const initialRegister = {
  role: 'prosumer',
  username: '',
  email: '',
  password: '',
  display_name: '',
  business_name: '',
  business_type: ''
};

const valueChips = [
  { icon: Network, label: 'Peer-to-peer solar matching', tone: 'teal' },
  { icon: CircleDollarSign, label: 'Higher prosumer value', tone: 'gold' },
  { icon: Building2, label: 'Lower consumer energy cost', tone: 'blue' }
];

const demoAccounts = [
  { role: 'Admin', login: 'admin / admin123' },
  { role: 'Prosumer', login: 'prosumer_demo / password123' },
  { role: 'Consumer', login: 'consumer_demo / password123' }
];

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);

  function updateLogin(field, value) {
    setLoginForm((current) => ({ ...current, [field]: value }));
  }

  function updateRegister(field, value) {
    setRegisterForm((current) => ({ ...current, [field]: value }));
  }

  async function submitLogin(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const data = await loginUser(loginForm);
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitRegister(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoading(true);
    try {
      const payload = {
        username: registerForm.username,
        email: registerForm.email,
        password: registerForm.password,
        role: registerForm.role
      };
      if (registerForm.role === 'prosumer') {
        payload.display_name = registerForm.display_name || registerForm.username;
      } else {
        payload.business_name = registerForm.business_name;
        payload.business_type = registerForm.business_type;
      }
      await registerUser(payload);
      setNotice('Account created. Login to continue setup.');
      setMode('login');
      setLoginForm({ username: registerForm.username, password: registerForm.password });
      setRegisterForm(initialRegister);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page auth-login-page">
      <section className="login-hero">
        <div className="login-hero-top">
          <div className="brand-block login-brand">
            <div className="logo-mark login-logo-mark">
              <img src={logoUrl} alt="SolarMate Logo" />
            </div>
            <div>
              <strong className="font-extrabold text-slate-900">SolarMate</strong>
              <span>Smarter Energy, Smarter Connections</span>
            </div>
          </div>
        </div>

        <div className="login-copy">
          <p className="eyebrow">Peer-to-peer solar sharing platform</p>
          <h1 className="font-extrabold">Peer-to-peer solar sharing, realised.</h1>
          <p>
            SolarMate connects solar prosumers and local consumers through intelligent energy matching,
            making renewable energy easier to share, track, and benefit from.
          </p>
          <div className="landing-chip-grid">
            {valueChips.map(({ icon: Icon, label, tone }) => (
              <span className={`landing-chip ${tone}`} key={label}>
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="solar-flow-card" aria-label="SolarMate energy flow">
          <div className="flow-node prosumer">
            <SunMedium size={22} />
            <strong>Prosumer</strong>
            <span>Exports surplus solar</span>
          </div>
          <ArrowRight className="flow-arrow" size={22} />
          <div className="flow-node matching">
            <Network size={22} />
            <strong>SolarMate</strong>
            <span>Matches supply and demand</span>
          </div>
          <ArrowRight className="flow-arrow" size={22} />
          <div className="flow-node consumer">
            <Building2 size={22} />
            <strong>Consumer</strong>
            <span>Uses greener credit</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <div className="auth-panel-header">
          <div>
            <p className="eyebrow">SolarMate member access</p>
            <h2>{mode === 'login' ? 'Access your portal' : 'Create your member account'}</h2>
            <p>
              {mode === 'login'
                ? 'Sign in to manage exports, consumption, billing, and wallet activity.'
                : 'Register as a prosumer or consumer, then complete your first setup.'}
            </p>
          </div>
          <span>
            {mode === 'login' ? <KeyRound size={20} /> : <UserPlus size={20} />}
          </span>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">
            Login
          </button>
          <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">
            Register
          </button>
        </div>

        {mode === 'login' ? (
          <form className="auth-form" onSubmit={submitLogin}>
            <div>
              <p className="eyebrow">Member login</p>
              <h2>Access your SolarMate portal</h2>
              <p className="auth-helper-text">Login as a prosumer, consumer, or admin.</p>
            </div>
            <label>
              Username
              <input
                autoComplete="username"
                placeholder="e.g. prosumer_demo"
                value={loginForm.username}
                onChange={(event) => updateLogin('username', event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                placeholder="Enter your password"
                type="password"
                value={loginForm.password}
                onChange={(event) => updateLogin('password', event.target.value)}
              />
            </label>
            <button className="primary-button" disabled={loading} type="submit">
              <ShieldCheck size={17} />
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={submitRegister}>
            <div>
              <p className="eyebrow">New member</p>
              <h2>Create a SolarMate account</h2>
              <p className="auth-helper-text">Choose your role first. Plan setup happens after first login.</p>
            </div>
            <div className="auth-role-toggle">
              <button
                className={registerForm.role === 'prosumer' ? 'active' : ''}
                onClick={() => updateRegister('role', 'prosumer')}
                type="button"
              >
                <SunMedium size={16} />
                Prosumer
              </button>
              <button
                className={registerForm.role === 'consumer' ? 'active' : ''}
                onClick={() => updateRegister('role', 'consumer')}
                type="button"
              >
                <Building2 size={16} />
                Consumer
              </button>
            </div>
            <label>
              Username
              <input
                autoComplete="username"
                placeholder="Choose a username"
                value={registerForm.username}
                onChange={(event) => updateRegister('username', event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                autoComplete="email"
                placeholder="you@example.com"
                type="email"
                value={registerForm.email}
                onChange={(event) => updateRegister('email', event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="new-password"
                placeholder="Create a password"
                type="password"
                value={registerForm.password}
                onChange={(event) => updateRegister('password', event.target.value)}
              />
            </label>
            {registerForm.role === 'prosumer' ? (
              <label>
                Display name
                <input
                  placeholder="e.g. Aidan Rooftop Solar"
                  value={registerForm.display_name}
                  onChange={(event) => updateRegister('display_name', event.target.value)}
                />
              </label>
            ) : (
              <>
                <label>
                  Business name
                  <input
                    placeholder="e.g. Green Bean Cafe"
                    value={registerForm.business_name}
                    onChange={(event) => updateRegister('business_name', event.target.value)}
                  />
                </label>
                <label>
                  Business type
                  <input
                    placeholder="e.g. Cafe, office, retail"
                    value={registerForm.business_type}
                    onChange={(event) => updateRegister('business_type', event.target.value)}
                  />
                </label>
              </>
            )}
            <button className="primary-button" disabled={loading} type="submit">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        )}

        {notice && <div className="success-message">{notice}</div>}
        {error && <div className="auth-error">{error}</div>}

        <div className="auth-demo-box">
          <div>
            <Sparkles size={16} />
            <strong>Demo Access</strong>
          </div>
          <div className="demo-access-grid">
            {demoAccounts.map((account) => (
              <span key={account.role}>
                <small>{account.role}</small>
                {account.login}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
