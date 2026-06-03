import { Building2, Leaf, ShieldCheck, Sparkles, SunMedium, Zap } from 'lucide-react';
import { useState } from 'react';
import { loginUser, registerUser } from '../api/client';
import { calculateRateDiscount } from '../utils/calculations';

const initialRegister = {
  role: 'prosumer',
  username: '',
  email: '',
  password: '',
  display_name: '',
  business_name: '',
  business_type: ''
};

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const rateDiscount = calculateRateDiscount();

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
        <div className="brand-block login-brand">
          <div className="logo-mark login-logo-mark">
            <Zap size={22} strokeWidth={2.6} />
          </div>
          <div>
            <strong className="font-extrabold text-slate-900">SolarMate</strong>
            <span>Smarter Energy, Smarter Connections</span>
          </div>
        </div>
        <div className="login-copy">
          <p className="eyebrow">Community solar sharing platform</p>
          <h1 className="font-extrabold">SolarMate</h1>
          <p>
            Sign in or register as a prosumer or low-voltage business consumer. Admin access is seeded
            locally for prototype management.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
            <span className="sm-pill"><Leaf size={12} /> Balanced green matching</span>
            <span className="sm-pill gold"><Sparkles size={12} /> 22.1% prosumer uplift</span>
            <span className="sm-pill blue">
              <Building2 size={12} /> {rateDiscount.rateDiscountPercentage.toFixed(1)}% rate discount
            </span>
          </div>
        </div>
        <div className="auth-demo-box">
          <strong>Default admin</strong>
          <span>admin / admin123</span>
        </div>
      </section>

      <section className="auth-panel">
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
            </div>
            <label>
              Username
              <input value={loginForm.username} onChange={(event) => updateLogin('username', event.target.value)} />
            </label>
            <label>
              Password
              <input
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
              <input value={registerForm.username} onChange={(event) => updateRegister('username', event.target.value)} />
            </label>
            <label>
              Email
              <input type="email" value={registerForm.email} onChange={(event) => updateRegister('email', event.target.value)} />
            </label>
            <label>
              Password
              <input
                type="password"
                value={registerForm.password}
                onChange={(event) => updateRegister('password', event.target.value)}
              />
            </label>
            {registerForm.role === 'prosumer' ? (
              <label>
                Display name
                <input
                  value={registerForm.display_name}
                  onChange={(event) => updateRegister('display_name', event.target.value)}
                />
              </label>
            ) : (
              <>
                <label>
                  Business name
                  <input
                    value={registerForm.business_name}
                    onChange={(event) => updateRegister('business_name', event.target.value)}
                  />
                </label>
                <label>
                  Business type
                  <input
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
      </section>
    </main>
  );
}
