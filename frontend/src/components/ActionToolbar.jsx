export const ActionToolbar = ({
  searchQuery,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  onOpenUpload,
}) => {
  return (
    <section className="action-toolbar">
      <div className="toolbar-filters">
        <div className="search-box">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search files live by name..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value)}
        >
          <option value="all">All File Types</option>
          <option value="pdf">PDF Documents (.pdf)</option>
          <option value="doc">Text & Markdown (.txt, .md)</option>
          <option value="data">Data Sheets (.csv)</option>
          <option value="image">Images (.png, .jpg, .svg)</option>
        </select>
      </div>
      <button type="button" className="btn btn-primary" onClick={onOpenUpload}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>+ Upload File</span>
      </button>
    </section>
  );
};
