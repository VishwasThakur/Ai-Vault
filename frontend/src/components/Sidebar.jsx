export const Sidebar = ({
  folders,
  currentFolderId,
  onSelectFolder,
  onOpenCreateFolder,
  onDeleteFolder,
  totalFiles,
}) => {
  return (
    <aside className="app-sidebar">
      <div>
        <div className="sidebar-section-title">
          <span>Folders</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            onClick={onOpenCreateFolder}
          >
            + New
          </button>
        </div>
        <ul className="folder-list">
          <li
            className={`folder-item ${currentFolderId === 'all' ? 'active' : ''}`}
            onClick={() => onSelectFolder('all', 'All Files')}
          >
            <div className="folder-item-left">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>All Files</span>
            </div>
            <span className="folder-badge">{totalFiles}</span>
          </li>

          {folders.map((folder) => (
            <li
              key={folder._id}
              className={`folder-item ${currentFolderId === folder._id ? 'active' : ''}`}
              onClick={(e) => {
                if (e.target.closest('[data-delete-btn]')) return;
                onSelectFolder(folder._id, folder.name);
              }}
            >
              <div className="folder-item-left">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
                </svg>
                <span title={folder.name}>{folder.name}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="folder-badge">{folder.fileCount || 0}</span>
                {!folder.isDefault && (
                  <button
                    type="button"
                    className="folder-delete-btn"
                    data-delete-btn="true"
                    title="Delete Folder"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete folder "${folder.name}"? Files inside will be moved to All Files.`)) {
                        onDeleteFolder(folder._id, folder.name);
                      }
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
};
