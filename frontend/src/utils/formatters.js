export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export const isAiReadable = (file) => {
  if (!file) return false;
  if (file.hasText) return true;
  if (file.isAiSupported !== undefined) return Boolean(file.isAiSupported);
  const ext = (file.extension || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  if (['pdf', 'txt', 'md', 'csv', 'docx'].includes(ext)) return true;
  if (name.endsWith('.csv') || name.endsWith('.docx') || name.includes('.csv') || name.includes('.docx')) return true;
  return false;
};
