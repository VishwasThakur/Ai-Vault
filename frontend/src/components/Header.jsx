import { useAuth } from '../context/AuthContext';

export const Header = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuth();

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="header-brand">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>VaultAI</span>
        </div>
        <nav className="nav-tab-container">
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => onTabChange('files')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            <span>My Files</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
            onClick={() => onTabChange('notes')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <line x1="8" y1="11" x2="16" y2="11"></line>
              <line x1="8" y1="15" x2="13" y2="15"></line>
            </svg>
            <span>Personal Notes</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => onTabChange('assistant')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            <span>Document Assistant</span>
          </button>
          <button
            type="button"
            className={`nav-tab-btn nav-tab-vault ${activeTab === 'vault' ? 'active' : ''}`}
            onClick={() => onTabChange('vault')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Critical Vault</span>
            <span className="vault-chip">PIN Secured</span>
          </button>
        </nav>
      </div>

      <div className="header-actions">
        <div className="vault-id-chip" title="Your permanent Vault Identifier">
          Vault ID: {user?.vaultId || '...'}
        </div>
        <div className="user-profile-badge">
          <div className="avatar-circle">{user?.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>
          <span>{user?.name || 'User'}</span>
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={logout}
          title="Sign out of VaultAI"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
};
