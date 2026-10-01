import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadVaultFile } from '../services/api';

export const CriticalUploadModal = ({ isOpen, onClose, onUploaded }) => {
  const { token, vaultToken } = useAuth();
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleClose = () => {
    if (uploading) return;
    setSelectedFile(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a document to secure', 'error');
      return;
    }

    if (!vaultToken) {
      showToast('Critical Vault is locked. Please unlock it with your PIN first.', 'error');
      onClose();
      return;
    }

    setUploading(true);
    try {
      await uploadVaultFile(token, vaultToken, selectedFile);
      showToast('Document securely stored in Critical Vault', 'success');
      setSelectedFile(null);
      if (onUploaded) onUploaded();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to upload critical document', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Secure Document in Critical Vault</h3>
          <button
            type="button"
            className="modal-close-btn"
            onClick={handleClose}
            disabled={uploading}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div
            className={`file-dropzone critical-dropzone ${isDragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#1e1b4b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <p style={{ fontWeight: 600, marginBottom: '4px', color: '#1e1b4b' }}>Select confidential document</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, TXT, CSV, Docs, Images (Max 10MB)</p>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {selectedFile && (
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e1b4b', marginBottom: '12px' }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Note: This document will only be accessible when your Critical Vault is unlocked with your 6-digit PIN.
          </p>

          <button
            type="submit"
            className="btn btn-vault-primary btn-block"
            disabled={!selectedFile || uploading}
          >
            <span className="btn-text">{uploading ? 'Securing Document...' : 'Lock Document in Critical Vault'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
