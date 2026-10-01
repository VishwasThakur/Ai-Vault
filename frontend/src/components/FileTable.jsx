import { formatBytes, formatDate, isAiReadable } from '../utils/formatters';

export const FileTable = ({
  files,
  currentFolderTitle,
  onOpenDownload,
  onAskAi,
  onDelete,
  onOpenUpload,
  onMoveFolder,
  loading = false,
}) => {
  return (
    <section className="table-card">
      <div className="table-header-title">
        <h2>{currentFolderTitle}</h2>
        <span className="folder-badge">{files.length} file{files.length === 1 ? '' : 's'}</span>
      </div>

      <div className="table-container">
        <table className="files-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Folder</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [1, 2, 3, 4].map((i) => (
                <tr key={i}>
                  <td colSpan={5}>
                    <div className="skeleton-row" style={{ height: '36px', borderRadius: '4px' }}></div>
                  </td>
                </tr>
              ))
            ) : (
              files.map((file) => {
                let iconClass = 'doc';
                const ext = (file.extension || '').toLowerCase();
                if (ext === 'pdf') iconClass = 'pdf';
                else if (['csv', 'xls', 'xlsx'].includes(ext)) iconClass = 'data';
                else if (['png', 'jpg', 'jpeg', 'svg', 'webp'].includes(ext)) iconClass = 'image';

                const aiSupported = isAiReadable(file);
                const hasCategorySuggestion =
                  file.suggestedCategory &&
                  file.suggestedFolderId &&
                  String(file.folderId) !== String(file.suggestedFolderId);

                return (
                  <tr key={file._id}>
                    <td>
                      <div className="file-name-cell">
                        <div className={`file-icon ${iconClass}`}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                          </svg>
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{file.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                            {file.extension}
                          </div>

                          {file.keywords && file.keywords.length > 0 && (
                            <div className="keyword-chips-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              {file.keywords.map((kw, idx) => (
                                <span key={idx} className="keyword-chip" title={`Keyword: ${kw}`}>
                                  #{kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="folder-tag">{file.folder || 'Unassigned'}</span>
                        {hasCategorySuggestion && onMoveFolder && (
                          <div style={{ marginTop: '6px' }}>
                            <div className="category-suggestion-pill">
                              <span>AI suggests: <strong>{file.suggestedCategory}</strong></span>
                              <button
                                type="button"
                                className="btn-suggestion-accept"
                                onClick={() => onMoveFolder(file._id, file.suggestedFolderId, file.suggestedCategory)}
                              >
                                Move
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>{formatBytes(file.size)}</td>
                    <td>{formatDate(file.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenDownload(file._id)}
                          title="Open or download file"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                          <span>Open</span>
                        </button>

                        {aiSupported && (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => onAskAi(file)}
                            title="Analyze with AI"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
                            </svg>
                            <span>Ask AI</span>
                          </button>
                        )}

                        <button
                          type="button"
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => onDelete(file._id, file.name)}
                          title="Permanently delete file"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && files.length === 0 && (
        <div className="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
          </svg>
          <h3>No files found</h3>
          <p>Upload a file to this vault folder or adjust your search filter.</p>
          <button type="button" className="btn btn-primary btn-sm" onClick={onOpenUpload}>
            + Upload File
          </button>
        </div>
      )}
    </section>
  );
};
