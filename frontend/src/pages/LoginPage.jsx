import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { loginUser, registerUser } from '../services/api';

export const LoginPage = () => {
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingNotice, setLoadingNotice] = useState('');

  useEffect(() => {
    let t1, t2;
    if (loading) {
      t1 = setTimeout(() => {
        setLoadingNotice('Connecting to server...');
      }, 2500);
      t2 = setTimeout(() => {
        setLoadingNotice('Waking up the server, this may take up to a minute (Render free-tier cold start)...');
      }, 6000);
    } else {
      setLoadingNotice('');
    }
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPin, setRegPin] = useState('');

  const [registeredVaultId, setRegisteredVaultId] = useState(null);

  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const email = loginEmail.trim();
    const password = loginPassword;

    if (!email || !password) {
      showToast('Please enter both email and password', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email, password);
      login(data.token, data.user);
      showToast('Login successful! Entering vault...', 'success');
      setTimeout(() => {
        navigate('/dashboard');
      }, 400);
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const name = regName.trim();
    const email = regEmail.trim();
    const password = regPassword;
    const pin = regPin.trim();

    if (!name || !email || !password || !pin) {
      showToast('Please fill in all registration fields', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    if (!/^\d{6}$/.test(pin)) {
      showToast('Vault PIN must be exactly 6 numeric digits', 'error');
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser(name, email, password, pin);
      login(data.token, data.user);
      setRegisteredVaultId(data.vaultId || 'VX-INITIALIZED');
    } catch (error) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-header">
        <div className="brand-badge">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>VaultAI</span>
        </div>
        <h1 className="auth-title">Personal AI File Vault</h1>
        <p className="auth-subtitle">Encrypted personal file vault with DigiLocker-style Critical Vault security and document AI</p>
      </div>

      <div className="auth-card">
        <div className="tab-nav">
          <button
            type="button"
            className={`tab-btn ${isLoginTab ? 'active' : ''}`}
            onClick={() => setIsLoginTab(true)}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`tab-btn ${!isLoginTab ? 'active' : ''}`}
            onClick={() => setIsLoginTab(false)}
          >
            Create Account
          </button>
        </div>

        {isLoginTab ? (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="login-email">Email Address</label>
              <input
                type="email"
                id="login-email"
                className="form-input"
                placeholder="name@domain.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="login-password">Password</label>
              <input
                type="password"
                id="login-password"
                className="form-input"
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <span className="btn-text">Sign In to Vault</span>
              )}
            </button>
            {loading && loadingNotice && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  lineHeight: 1.4,
                }}
              >
                <div
                  className="spinner"
                  style={{
                    width: '14px',
                    height: '14px',
                    borderWidth: '2px',
                    borderColor: '#3b82f6',
                    borderTopColor: 'transparent',
                    flexShrink: 0,
                  }}
                />
                <span>{loadingNotice}</span>
              </div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-name">Full Name</label>
              <input
                type="text"
                id="reg-name"
                className="form-input"
                placeholder="Alex Morgan"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-email">Email Address</label>
              <input
                type="email"
                id="reg-email"
                className="form-input"
                placeholder="name@domain.com"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-password">Account Password</label>
              <input
                type="password"
                id="reg-password"
                className="form-input"
                placeholder="Minimum 6 characters"
                minLength="6"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="reg-pin">6-Digit Vault PIN (Critical Vault Security)</label>
              <input
                type="password"
                id="reg-pin"
                className="form-input"
                placeholder="6-digit numeric PIN (e.g. 123456)"
                maxLength="6"
                pattern="[0-9]{6}"
                inputMode="numeric"
                value={regPin}
                onChange={(e) => setRegPin(e.target.value)}
                required
                autoComplete="off"
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '5px' }}>
                DigiLocker-style secondary PIN required to unlock sensitive documents in your Critical Vault.
              </p>
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Initializing Vault...</span>
                </>
              ) : (
                <span className="btn-text">Create Free Account</span>
              )}
            </button>
            {loading && loadingNotice && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid #bfdbfe',
                  borderRadius: '8px',
                  fontSize: '0.825rem',
                  color: '#1d4ed8',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  lineHeight: 1.4,
                }}
              >
                <div
                  className="spinner"
                  style={{
                    width: '14px',
                    height: '14px',
                    borderWidth: '2px',
                    borderColor: '#3b82f6',
                    borderTopColor: 'transparent',
                    flexShrink: 0,
                  }}
                />
                <span>{loadingNotice}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {registeredVaultId && (
        <div className="modal-overlay active">
          <div className="modal-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>🔐</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-main)' }}>
              Vault Initialized Successfully
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
              Your unique, human-shareable Vault ID has been issued:
            </p>
            <div
              style={{
                background: 'var(--bg-hover)',
                border: '1px dashed var(--primary)',
                padding: '12px',
                borderRadius: '8px',
                fontFamily: 'monospace',
                fontSize: '1.35rem',
                fontWeight: 700,
                color: 'var(--primary)',
                letterSpacing: '1.5px',
                marginBottom: '16px',
              }}
            >
              <span>{registeredVaultId}</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Save this Vault ID along with your 6-digit Vault PIN. You will need your PIN whenever accessing the extra-secure Critical Vault section.
            </p>
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => navigate('/dashboard')}
            >
              Proceed to Vault Dashboard &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
