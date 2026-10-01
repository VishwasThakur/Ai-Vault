import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { unlockVault as apiUnlockVault, getVaultFiles, deleteVaultFile, getVaultFileDownloadUrl } from '../services/api';
import { formatBytes, formatDate } from '../utils/formatters';

export const CriticalVault = ({
  onOpenCriticalUpload,
  onOpenResetPin,
  refreshTrigger,
  onVaultFileChange,
}) => {
  const { token, vaultToken, isVaultUnlocked, unlockVault, lockVault } = useAuth();
  const { showToast } = useToast();

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinError, setPinError] = useState('');
  const [shake, setShake] = useState(false);

  const [criticalFiles, setCriticalFiles] = useState([]);
  const [secondsRemaining, setSecondsRemaining] = useState(900);
  const timerRef = useRef(null);

  const fetchCriticalFiles = async () => {
    if (!token || !vaultToken) return;
    try {
      const res = await getVaultFiles(token, vaultToken);
      setCriticalFiles(res.files || []);
    } catch (err) {
      if (err.vaultLocked) {
        lockVault();
        showToast('Critical Vault session locked', 'error');
      }
    }
  };

  useEffect(() => {
    if (isVaultUnlocked) {
      fetchCriticalFiles();
      setSecondsRemaining(900);
      clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            lockVault();
            showToast('Critical Vault session timed out. Please enter your PIN again.', 'error');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
      setCriticalFiles([]);
    }
  }, [isVaultUnlocked, vaultToken, refreshTrigger]);

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    const cleanPin = pin.trim();

    if (!/^\d{6}$/.test(cleanPin)) {
      setPinError('PIN must be exactly 6 numeric digits');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setLoading(true);
    setPinError('');

    try {
      const data = await apiUnlockVault(token, cleanPin);
      unlockVault(data.vaultToken);
      showToast('Critical Vault unlocked', 'success');
      setPin('');
    } catch (error) {
      setPinError(error.message);
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleManualLock = () => {
    lockVault();
    showToast('Critical Vault locked', 'success');
  };

  const handleDeleteCriticalFile = async (fileId, fileName) => {
    if (!window.confirm(`Permanently remove "${fileName}" from your Critical Vault?`)) return;

    try {
      await deleteVaultFile(token, vaultToken, fileId);
      showToast('Document removed from Critical Vault', 'success');
      await fetchCriticalFiles();
      if (onVaultFileChange) onVaultFileChange();
    } catch (error) {
      showToast(error.message, 'error');
    }
  };

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  if (!isVaultUnlocked) {
    return (
      <main className="app-main" style={{ maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
        <div className={`vault-auth-card ${shake ? 'shake' : ''}`}>
          <div className="vault-shield-icon">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 className="vault-auth-title">Critical Vault &mdash; Restricted Access</h2>
          <p className="vault-auth-subtitle">
            Enter your 6-digit numeric Vault PIN to unlock your encrypted personal repository.
            Critical files are completely isolated from standard searches and AI indexes.
          </p>

          <form onSubmit={handleUnlockSubmit} className="vault-pin-form">
            {pinError && <div className="vault-alert-error">{pinError}</div>}

            <div className="form-group" style={{ textAlign: 'center' }}>
              <label className="form-label" htmlFor="input-vault-pin" style={{ marginBottom: '8px' }}>
                6-Digit Security PIN
              </label>
              <input
                type="password"
                id="input-vault-pin"
                className="form-input vault-pin-input"
                maxLength="6"
                pattern="[0-9]{6}"
                inputMode="numeric"
                placeholder="••••••"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn btn-vault-primary btn-block" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner"></div>
                  <span>Verifying PIN...</span>
                </>
              ) : (
                <span className="btn-text">Unlock Critical Vault</span>
              )}
            </button>

            <div style={{ marginTop: '16px', textAlign: 'center' }}>
              <button
                type="button"
                className="btn-link-action"
                onClick={onOpenResetPin}
              >
                Forgot Vault PIN?
              </button>
            </div>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="app-main" style={{ maxWidth: '1040px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="critical-banner">
          <div className="critical-banner-left">
            <div className="critical-shield-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <div>
              <h3 className="critical-banner-title">Critical Vault Active (High Security Zone)</h3>
              <p className="critical-banner-subtitle">
                Isolated encrypted storage for confidential papers, passports, certificates, and recovery credentials.
              </p>
            </div>
          </div>

          <div className="critical-banner-right">
            <div className="vault-timer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Expires in: <strong>{formattedTimer}</strong></span>
            </div>
            <button
              type="button"
              className="btn btn-vault-lock btn-sm"
              onClick={handleManualLock}
              title="Immediately terminate vault session"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <span>Lock Vault</span>
            </button>
          </div>
        </div>

        <section className="action-toolbar" style={{ marginTop: 0 }}>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Documents stored here are protected with DigiLocker-inspired secondary authentication and are never exposed to standard file listings.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-vault-primary"
            onClick={onOpenCriticalUpload}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>+ Secure Document</span>
          </button>
        </section>

        <section className="table-card critical-table-card">
          <div className="table-header-title" style={{ background: 'rgba(30, 27, 75, 0.04)' }}>
            <h2>Secured Critical Documents</h2>
            <span className="folder-badge" style={{ background: 'rgba(30, 27, 75, 0.1)', color: '#1e1b4b' }}>
              {criticalFiles.length} file{criticalFiles.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="table-container">
            <table className="files-table">
              <thead>
                <tr>
                  <th>Document Name</th>
                  <th>Security Tier</th>
                  <th>Size</th>
                  <th>Secured On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {criticalFiles.map((file) => (
                  <tr key={file._id}>
                    <td>
                      <div className="file-name-cell">
                        <div className="file-icon" style={{ background: 'rgba(30, 27, 75, 0.1)', color: '#1e1b4b' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1e1b4b' }}>{file.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {file.extension}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="vault-secure-tag">Critical &bull; PIN Protected</span>
                    </td>
                    <td>{formatBytes(file.size)}</td>
                    <td>{formatDate(file.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => window.open(getVaultFileDownloadUrl(file._id, token, vaultToken), '_blank')}
                          title="Decrypt and view file"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          <span>Open</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => handleDeleteCriticalFile(file._id, file.name)}
                          title="Permanently erase from vault"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {criticalFiles.length === 0 && (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              <h3>No critical documents secured</h3>
              <p>Upload important documents, tax receipts, or recovery keys to store them inside this PIN-protected vault.</p>
              <button
                type="button"
                className="btn btn-vault-primary btn-sm"
                onClick={onOpenCriticalUpload}
              >
                + Secure Document
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
