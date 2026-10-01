import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { uploadFile } from '../services/api';

export const UploadModal = ({ isOpen, onClose, folders = [], onUploaded }) => {
  const { token } = useAuth();
  const { showToast } = useToast();

  const [selectedFile, setSelectedFile] = useState(null);
  const [folderId, setFolderId] = useState('');
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
    setFolderId('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    setUploading(true);
    try {
      await uploadFile(token, selectedFile, folderId || null);
      showToast('File uploaded successfully', 'success');
      setSelectedFile(null);
      setFolderId('');
      if (onUploaded) onUploaded();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to upload file', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay active" onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-card">
        <div className="modal-header">
          <h3 className="modal-title">Upload File to Vault</h3>
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
            className={`file-dropzone ${isDragOver ? 'dragover' : ''}`}
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p style={{ fontWeight: 600, marginBottom: '4px' }}>Choose a file or drag & drop here</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>PDF, TXT, Markdown, CSV, Images (Max 10MB)</p>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          {selectedFile && (
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '12px' }}>
              Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="select-upload-folder">Assign to Folder</label>
            <select
              id="select-upload-folder"
              className="form-select"
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              disabled={uploading}
            >
              <option value="">All Files (Unassigned)</option>
              {folders.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={!selectedFile || uploading}
          >
            <span className="btn-text">{uploading ? 'Uploading...' : 'Upload File'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
