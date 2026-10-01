import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { summarizeFile, askAI, extractKeywords } from '../services/api';
import { formatBytes, isAiReadable } from '../utils/formatters';

export const DocumentAssistant = ({ files, selectedFileId, onSelectFileId, onKeywordsExtracted }) => {
  const [question, setQuestion] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingQuestion, setLoadingQuestion] = useState(false);
  const [loadingKeywords, setLoadingKeywords] = useState(false);
  const [responseContent, setResponseContent] = useState('');
  const [copyButtonText, setCopyButtonText] = useState('Copy');

  const { token } = useAuth();
  const { showToast } = useToast();

  const selectedFile = files.find((f) => f._id === selectedFileId);

  const handleSummarize = async () => {
    if (!selectedFileId) {
      showToast('Please select a target document from the dropdown first', 'error');
      setResponseContent('⚠️ Please select a target document from the dropdown first.');
      return;
    }

    if (selectedFile && !isAiReadable(selectedFile)) {
      showToast('This file format is not supported for AI document intelligence', 'error');
      return;
    }

    setLoadingSummary(true);
    setResponseContent('Generating document summary with Gemini AI...');

    try {
      const res = await summarizeFile(token, selectedFileId);
      setResponseContent(res.summary);
    } catch (error) {
      setResponseContent(`⚠️ ${error.message}`);
      showToast(error.message, 'error');
    } finally {
      setLoadingSummary(false);
    }
  };

  const handleAskQuestion = async (e) => {
    if (e) e.preventDefault();

    if (!selectedFileId || !question.trim()) {
      showToast('Please select a document and enter a question', 'error');
      setResponseContent('⚠️ Please select a document and enter a question.');
      return;
    }

    if (selectedFile && !isAiReadable(selectedFile)) {
      showToast('This file format is not supported for AI document intelligence', 'error');
      return;
    }

    setLoadingQuestion(true);
    setResponseContent(`Thinking... analyzing document to answer: "${question.trim()}"...`);

    try {
      const res = await askAI(token, selectedFileId, question.trim());
      setResponseContent(res.answer);
    } catch (error) {
      setResponseContent(`⚠️ ${error.message}`);
      showToast(error.message, 'error');
    } finally {
      setLoadingQuestion(false);
    }
  };

  const handleExtractKeywords = async () => {
    if (!selectedFileId) return;
    setLoadingKeywords(true);
    try {
      const res = await extractKeywords(token, selectedFileId);
      showToast('Keywords extracted successfully', 'success');
      if (onKeywordsExtracted) {
        onKeywordsExtracted(selectedFileId, res.keywords || []);
      }
    } catch (err) {
      showToast(err.message || 'Failed to extract keywords', 'error');
    } finally {
      setLoadingKeywords(false);
    }
  };

  const handleCopy = () => {
    if (!responseContent) return;
    navigator.clipboard.writeText(responseContent).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => {
        setCopyButtonText('Copy');
      }, 2000);
    });
  };

  return (
    <main className="app-main" style={{ maxWidth: '980px', margin: '0 auto', width: '100%' }}>
      <section className="ai-section" id="ai-workspace">
        <div className="ai-header">
          <div className="ai-icon-pill">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
          </div>
          <div className="ai-header-text">
            <h3>VaultAI Document Assistant</h3>
            <p>Grounded AI intelligence powered by Google Gemini. Select any PDF, DOCX, TXT, MD, or CSV document to generate summaries or ask targeted questions.</p>
          </div>
        </div>

        <div className="ai-controls">
          <div className="ai-row">
            <div style={{ flex: 1, minWidth: '250px' }}>
              <label className="form-label" htmlFor="ai-file-select">Target Document</label>
              <select
                id="ai-file-select"
                className="form-select"
                value={selectedFileId}
                onChange={(e) => onSelectFileId(e.target.value)}
              >
                <option value="">-- Choose a document from your vault --</option>
                {files.map((file) => {
                  const readable = isAiReadable(file);
                  return (
                    <option key={file._id} value={file._id} disabled={!readable} style={!readable ? { color: '#94a3b8' } : undefined}>
                      {file.name} {readable ? `(${formatBytes(file.size)})` : '— (unsupported format)'}
                    </option>
                  );
                })}
              </select>

              {selectedFile && isAiReadable(selectedFile) && (
                <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedFile.keywords && selectedFile.keywords.length > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Keywords:</span>
                      {selectedFile.keywords.map((kw, idx) => (
                        <span key={idx} className="keyword-chip" style={{ fontSize: '0.75rem' }}>
                          #{kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>No keywords extracted yet.</span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: '0.75rem', padding: '3px 8px' }}
                        onClick={handleExtractKeywords}
                        disabled={loadingKeywords}
                      >
                        {loadingKeywords ? 'Extracting...' : '+ Extract Keywords'}
                      </button>
                    </div>
                  )}

                  {selectedFile.suggestedCategory && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--accent-gold)' }}>
                      Folder Suggestion: <strong>{selectedFile.suggestedCategory}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSummarize}
                disabled={loadingSummary || loadingQuestion || !selectedFileId}
              >
                {loadingSummary ? (
                  <>
                    <div className="spinner"></div>
                    <span>Summarizing...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="21" y1="10" x2="3" y2="10"></line>
                      <line x1="21" y1="6" x2="3" y2="6"></line>
                      <line x1="21" y1="14" x2="3" y2="14"></line>
                      <line x1="21" y1="18" x2="3" y2="18"></line>
                    </svg>
                    <span>Summarize Document</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <form onSubmit={handleAskQuestion} className="ai-row">
            <div className="ai-input-group">
              <input
                type="text"
                className="form-input"
                placeholder="Ask anything about this document... (e.g. What are the key points?)"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-secondary"
                disabled={loadingSummary || loadingQuestion || !selectedFileId}
              >
                {loadingQuestion ? (
                  <>
                    <div className="spinner spinner-dark"></div>
                    <span>Thinking...</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <span>Ask AI</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {responseContent && (
            <div className="ai-response-box active">
              <button
                type="button"
                className="btn btn-secondary btn-sm copy-btn"
                onClick={handleCopy}
                title="Copy response"
              >
                {copyButtonText}
              </button>
              <div>{responseContent}</div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
