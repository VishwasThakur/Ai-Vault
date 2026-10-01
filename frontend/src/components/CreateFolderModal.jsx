import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createFolder } from '../services/api';

export const CreateFolderModal = ({ isOpen, onClose, onFolderCreated }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [folderName, setFolderName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (submitting) return;
    setFolderName('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = folderName.trim();
    if (!trimmed) {
      showToast('Please enter a folder name', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await createFolder(token, trimmed);
      showToast(`Folder "${trimmed}" created`, 'success');
      setFolderName('');
      if (onFolderCreated) onFolderCreated();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to create folder', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Create New Folder</h3>
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
          <div className="form-group">
            <label className="form-label" htmlFor="input-new-folder-name">Folder Name</label>
            <input
              type="text"
              id="input-new-folder-name"
              className="form-input"
              placeholder="e.g. Research Papers, Invoices"
              required
              maxLength={40}
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              disabled={submitting}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
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
              disabled={!folderName.trim() || submitting}
            >
              <span className="btn-text">{submitting ? 'Creating...' : 'Create Folder'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
