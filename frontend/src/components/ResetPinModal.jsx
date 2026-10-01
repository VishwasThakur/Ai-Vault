import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { resetVaultPin } from '../services/api';

export const ResetPinModal = ({ isOpen, onClose }) => {
  const { token, lockVault } = useAuth();
  const { showToast } = useToast();

  const [password, setPassword] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (submitting) return;
    setPassword('');
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password) {
      showToast('Please enter your account password', 'error');
      return;
    }
    if (!/^\d{6}$/.test(newPin)) {
      showToast('New PIN must be exactly 6 numeric digits', 'error');
      return;
    }
    if (newPin !== confirmPin) {
      showToast('New PIN and confirmation do not match', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await resetVaultPin(token, password, newPin);
      showToast('Vault PIN reset successfully. Please unlock using your new PIN.', 'success');
      lockVault();
      handleClose();
    } catch (err) {
      showToast(err.message || 'Failed to reset Vault PIN', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card" style={{ maxWidth: '420px' }}>
        <div className="modal-header">
          <h3 className="modal-title">Reset Vault PIN</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={submitting}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Verify your account password to establish a new 6-digit numeric Vault PIN.
          </p>

          <div className="form-group">
            <label className="form-label" htmlFor="input-reset-password">Account Password</label>
            <input
              type="password"
              id="input-reset-password"
              className="form-input"
              placeholder="Your current account password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-reset-new-pin">New 6-Digit PIN</label>
            <input
              type="password"
              id="input-reset-new-pin"
              className="form-input"
              placeholder="6 numeric digits"
              maxLength={6}
              pattern="[0-9]{6}"
              inputMode="numeric"
              required
              autoComplete="off"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="input-reset-confirm-pin">Confirm New 6-Digit PIN</label>
            <input
              type="password"
              id="input-reset-confirm-pin"
              className="form-input"
              placeholder="Re-enter 6 numeric digits"
              maxLength={6}
              pattern="[0-9]{6}"
              inputMode="numeric"
              required
              autoComplete="off"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
            >
              <span className="btn-text">{submitting ? 'Updating...' : 'Update Vault PIN'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
