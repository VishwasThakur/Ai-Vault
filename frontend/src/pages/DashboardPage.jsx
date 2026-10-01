import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Header } from '../components/Header';
import { Sidebar } from '../components/Sidebar';
import { StatCards } from '../components/StatCards';
import { ActionToolbar } from '../components/ActionToolbar';
import { FileTable } from '../components/FileTable';
import { DocumentAssistant } from '../components/DocumentAssistant';
import { NotesSection } from '../components/NotesSection';
import { CriticalVault } from '../components/CriticalVault';
import { UploadModal } from '../components/UploadModal';
import { CreateFolderModal } from '../components/CreateFolderModal';
import { CriticalUploadModal } from '../components/CriticalUploadModal';
import { ResetPinModal } from '../components/ResetPinModal';
import {
  getFiles,
  getFolders,
  deleteFolder,
  deleteFile,
  moveFileFolder,
  getStats,
  getFileDownloadUrl,
} from '../services/api';

export const DashboardPage = () => {
  const { token, refreshProfile } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('files');
  const [currentFolderId, setCurrentFolderId] = useState('all');
  const [currentFolderTitle, setCurrentFolderTitle] = useState('All Files');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [files, setFiles] = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [allVaultFiles, setAllVaultFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [totalAllFiles, setTotalAllFiles] = useState(0);
  const [stats, setStats] = useState({
    totalFiles: 0,
    totalFolders: 0,
    storageUsedMB: 0,
    storagePercentage: 0,
  });

  const [selectedAiFileId, setSelectedAiFileId] = useState('');

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isCriticalUploadOpen, setIsCriticalUploadOpen] = useState(false);
  const [isResetPinOpen, setIsResetPinOpen] = useState(false);
  const [criticalRefreshTrigger, setCriticalRefreshTrigger] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getStats(token);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch {}
  }, [token]);

  const fetchFolders = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getFolders(token);
      setFolders(res.folders || []);
      setTotalAllFiles(res.totalFiles || 0);
    } catch {}
  }, [token]);

  const fetchAllVaultFiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await getFiles(token, { folderId: 'all' });
      setAllVaultFiles(res.files || []);
    } catch {}
  }, [token]);

  const fetchFiles = useCallback(async () => {
    if (!token) return;
    try {
      setFilesLoading(true);
      const res = await getFiles(token, {
        folderId: currentFolderId,
        search: searchQuery,
        type: typeFilter,
      });
      setFiles(res.files || []);
    } catch {} finally {
      setFilesLoading(false);
    }
  }, [token, currentFolderId, searchQuery, typeFilter]);

  useEffect(() => {
    if (token) {
      refreshProfile();
      fetchStats();
      fetchFolders();
      fetchAllVaultFiles();
    }
  }, [token, refreshProfile, fetchStats, fetchFolders, fetchAllVaultFiles]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleSelectFolder = (folderId, folderName) => {
    setCurrentFolderId(folderId);
    setCurrentFolderTitle(folderName);
  };

  const handleDeleteFolder = async (folderId, folderName) => {
    if (!window.confirm(`Delete folder "${folderName}"? Files inside will be moved to All Files.`)) {
      return;
    }

    try {
      await deleteFolder(token, folderId);
      showToast(`Folder "${folderName}" deleted`, 'info');
      if (currentFolderId === folderId) {
        setCurrentFolderId('all');
        setCurrentFolderTitle('All Files');
      }
      fetchFolders();
      fetchFiles();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete folder', 'error');
    }
  };

  const handleOpenDownload = (fileId) => {
    const url = getFileDownloadUrl(fileId, token);
    window.open(url, '_blank');
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteFile(token, fileId);
      showToast('File permanently deleted', 'info');
      fetchFiles();
      fetchAllVaultFiles();
      fetchFolders();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to delete file', 'error');
    }
  };

  const handleMoveFolder = async (fileId, targetFolderId, targetFolderName) => {
    try {
      await moveFileFolder(token, fileId, targetFolderId);
      showToast(`File moved to "${targetFolderName}"`, 'success');
      fetchFiles();
      fetchFolders();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Failed to move file', 'error');
    }
  };

  const handleKeywordsExtracted = (fileId, keywords) => {
    setFiles((prev) =>
      prev.map((f) => (f._id === fileId ? { ...f, keywords } : f))
    );
    setAllVaultFiles((prev) =>
      prev.map((f) => (f._id === fileId ? { ...f, keywords } : f))
    );
  };

  const handleAskAi = (file) => {
    setSelectedAiFileId(file._id);
    setActiveTab('assistant');
  };

  const handleUploaded = () => {
    fetchFiles();
    fetchAllVaultFiles();
    fetchFolders();
    fetchStats();
  };

  const handleFolderCreated = () => {
    fetchFolders();
    fetchStats();
  };

  const handleCriticalUploaded = () => {
    setCriticalRefreshTrigger((prev) => prev + 1);
    fetchStats();
  };

  return (
    <div className="app-container">
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="app-body">
        <div
          id="section-my-files"
          className={`dashboard-tab-panel ${activeTab === 'files' ? 'active' : ''}`}
          style={{ display: activeTab === 'files' ? 'block' : 'none' }}
        >
          <div className="files-layout">
            <Sidebar
              folders={folders}
              currentFolderId={currentFolderId}
              onSelectFolder={handleSelectFolder}
              onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
              onDeleteFolder={handleDeleteFolder}
              totalFiles={totalAllFiles}
            />

            <main className="app-main">
              <StatCards stats={stats} />

              <ActionToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                onOpenUpload={() => setIsUploadOpen(true)}
              />

              <FileTable
                files={files}
                currentFolderTitle={currentFolderTitle}
                onOpenDownload={handleOpenDownload}
                onAskAi={handleAskAi}
                onDelete={handleDeleteFile}
                onOpenUpload={() => setIsUploadOpen(true)}
                onMoveFolder={handleMoveFolder}
                loading={filesLoading}
              />
            </main>
          </div>
        </div>

        <div
          id="section-notes"
          className={`dashboard-tab-panel ${activeTab === 'notes' ? 'active' : ''}`}
          style={{ display: activeTab === 'notes' ? 'block' : 'none' }}
        >
          <NotesSection />
        </div>

        <div
          id="section-assistant"
          className={`dashboard-tab-panel ${activeTab === 'assistant' ? 'active' : ''}`}
          style={{ display: activeTab === 'assistant' ? 'block' : 'none' }}
        >
          <main className="app-main" style={{ maxWidth: '980px', margin: '0 auto', width: '100%' }}>
            <DocumentAssistant
              files={allVaultFiles}
              selectedFileId={selectedAiFileId}
              onSelectFileId={setSelectedAiFileId}
              onKeywordsExtracted={handleKeywordsExtracted}
            />
          </main>
        </div>

        <div
          id="section-critical-vault"
          className={`dashboard-tab-panel ${activeTab === 'vault' ? 'active' : ''}`}
          style={{ display: activeTab === 'vault' ? 'block' : 'none' }}
        >
          <CriticalVault
            onOpenCriticalUpload={() => setIsCriticalUploadOpen(true)}
            onOpenResetPin={() => setIsResetPinOpen(true)}
            refreshTrigger={criticalRefreshTrigger}
            onVaultFileChange={fetchStats}
          />
        </div>
      </div>

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folders={folders}
        onUploaded={handleUploaded}
      />

      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onFolderCreated={handleFolderCreated}
      />

      <CriticalUploadModal
        isOpen={isCriticalUploadOpen}
        onClose={() => setIsCriticalUploadOpen(false)}
        onUploaded={handleCriticalUploaded}
      />

      <ResetPinModal
        isOpen={isResetPinOpen}
        onClose={() => setIsResetPinOpen(false)}
      />
    </div>
  );
};
