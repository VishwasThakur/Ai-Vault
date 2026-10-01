const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const isDocumentAiSupported = (fileNameOrExt) => {
  if (!fileNameOrExt) return false;
  const name = fileNameOrExt.toLowerCase();
  const ext = name.split('.').pop().trim();
  return (
    ['pdf', 'txt', 'md', 'csv', 'docx'].includes(ext) ||
    name.includes('.csv') ||
    name.includes('.docx')
  );
};

const extractTextFromFile = async (buffer, originalName = '', mimeType = '') => {
  if (!buffer || buffer.length === 0) return '';

  const name = (originalName || '').toLowerCase();
  const ext = name.split('.').pop().trim();
  const MAX_TEXT_LENGTH = 50000;

  try {
    if (ext === 'pdf' || mimeType === 'application/pdf') {
      const data = await pdfParse(buffer);
      const text = (data.text || '').trim();

      const wordCount = text.split(/\s+/).filter(Boolean).length;
      if (text.length < 25 || wordCount < 5) {
        return 'This looks like a scanned document with no readable text — AI features need a text-based PDF';
      }
      return text.slice(0, MAX_TEXT_LENGTH);
    }

    if (ext === 'docx' || name.includes('.docx') || mimeType.includes('wordprocessingml')) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text || text.length === 0) {
        return 'This Word document appears to be empty or contains only non-text elements.';
      }
      return text.slice(0, MAX_TEXT_LENGTH);
    }

    if (ext === 'csv' || name.includes('.csv') || mimeType === 'text/csv') {
      const raw = buffer.toString('utf-8').trim();
      const lines = raw.split(/\r?\n/).slice(0, 1000);
      const headerNote = `This is a CSV file containing tabular data with rows and columns:\n`;
      return (headerNote + lines.join('\n')).slice(0, MAX_TEXT_LENGTH);
    }

    if (ext === 'txt' || ext === 'md' || mimeType.startsWith('text/')) {
      const text = buffer.toString('utf-8').trim();
      return text.slice(0, MAX_TEXT_LENGTH);
    }

    return '';
  } catch (error) {
    return '';
  }
};

module.exports = {
  extractTextFromFile,
  isDocumentAiSupported,
};
