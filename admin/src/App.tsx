import React, { useState, useEffect } from 'react';

interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  alt: string;
  aspect: string;
}

interface Story {
  id: string;
  title: string;
  date: string;
  excerpt: string;
  coverImage: string;
  category: string;
  content: string;
}

const API_BASE = 'http://127.0.0.1:8000';

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'stories'>('dashboard');
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  
  // Loading & Error States
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingStories, setLoadingStories] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Portfolio Form State
  const [portTitle, setPortTitle] = useState('');
  const [portCategory, setPortCategory] = useState('weddings');
  const [portAspect, setPortAspect] = useState('standard');
  const [portFile, setPortFile] = useState<File | null>(null);
  const [portSubmitting, setPortSubmitting] = useState(false);

  // Stories Form State
  const [storyTitle, setStoryTitle] = useState('');
  const [storyCategory, setStoryCategory] = useState('Weddings');
  const [storyDate, setStoryDate] = useState(new Date().toISOString().split('T')[0]);
  const [storyExcerpt, setStoryExcerpt] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [storyFile, setStoryFile] = useState<File | null>(null);
  const [storySubmitting, setStorySubmitting] = useState(false);

  // Fetch Data
  const fetchPortfolio = async () => {
    setLoadingPortfolio(true);
    try {
      const res = await fetch(`${API_BASE}/api/portfolio`);
      if (res.ok) {
        const data = await res.json();
        setPortfolioItems(data);
      } else {
        throw new Error('Failed to fetch portfolio');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not connect to API server. Make sure the backend FastAPI app is running on port 8000.');
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchStories = async () => {
    setLoadingStories(true);
    try {
      const res = await fetch(`${API_BASE}/api/stories`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      } else {
        throw new Error('Failed to fetch stories');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Could not connect to API server. Make sure the backend FastAPI app is running on port 8000.');
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    fetchStories();
  }, []);

  const handleMessage = (type: 'success' | 'error', text: string) => {
    if (type === 'success') {
      setSuccessMsg(text);
      setErrorMsg('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(text);
      setSuccessMsg('');
      setTimeout(() => setErrorMsg(''), 6000);
    }
  };

  // Create Portfolio Item
  const handlePortfolioSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portTitle || !portFile) {
      handleMessage('error', 'Please provide a title and select an image file.');
      return;
    }

    setPortSubmitting(true);
    const formData = new FormData();
    formData.append('title', portTitle);
    formData.append('category', portCategory);
    formData.append('aspect', portAspect);
    formData.append('file', portFile);

    try {
      const res = await fetch(`${API_BASE}/api/portfolio`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newItem = await res.json();
        setPortfolioItems((prev) => [...prev, newItem]);
        setPortTitle('');
        setPortFile(null);
        // Reset file input element visually
        const fileInput = document.getElementById('portfolio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        handleMessage('success', `Successfully uploaded "${portTitle}" and compressed to WebP!`);
      } else {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to upload portfolio item');
      }
    } catch (err: any) {
      console.error(err);
      handleMessage('error', err.message || 'Error uploading portfolio item.');
    } finally {
      setPortSubmitting(false);
    }
  };

  // Delete Portfolio Item
  const handleDeletePortfolio = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove the image file from disk.`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/portfolio/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setPortfolioItems((prev) => prev.filter((item) => item.id !== id));
        handleMessage('success', `Deleted "${title}" successfully.`);
      } else {
        throw new Error('Failed to delete item');
      }
    } catch (err: any) {
      console.error(err);
      handleMessage('error', 'Error deleting portfolio item.');
    }
  };

  // Create Story
  const handleStorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyTitle || !storyExcerpt || !storyContent) {
      handleMessage('error', 'Please fill in the title, excerpt, and content.');
      return;
    }

    setStorySubmitting(true);
    const formData = new FormData();
    formData.append('title', storyTitle);
    formData.append('date', storyDate);
    formData.append('excerpt', storyExcerpt);
    formData.append('category', storyCategory);
    formData.append('content', storyContent);
    if (storyFile) {
      formData.append('file', storyFile);
    }

    try {
      const res = await fetch(`${API_BASE}/api/stories`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newStory = await res.json();
        setStories((prev) => [...prev, newStory]);
        setStoryTitle('');
        setStoryExcerpt('');
        setStoryContent('');
        setStoryFile(null);
        // Reset file input element visually
        const fileInput = document.getElementById('story-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        handleMessage('success', `Successfully published story "${storyTitle}"!`);
      } else {
        const data = await res.json();
        throw new Error(data.detail || 'Failed to publish story');
      }
    } catch (err: any) {
      console.error(err);
      handleMessage('error', err.message || 'Error publishing story.');
    } finally {
      setStorySubmitting(false);
    }
  };

  // Delete Story
  const handleDeleteStory = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete the story "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/stories/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setStories((prev) => prev.filter((story) => story.id !== id));
        handleMessage('success', `Deleted story "${title}" successfully.`);
      } else {
        throw new Error('Failed to delete story');
      }
    } catch (err: any) {
      console.error(err);
      handleMessage('error', 'Error deleting story.');
    }
  };

  return (
    <div className="admin-app">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-container header-flex">
          <div className="logo-group">
            <h1 className="logo">NONIMEDIA <span>CONCEPT</span></h1>
            <span className="badge">Admin Portal</span>
          </div>
          <nav className="admin-nav">
            <button 
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-btn ${activeTab === 'portfolio' ? 'active' : ''}`}
              onClick={() => setActiveTab('portfolio')}
            >
              Portfolio Manager
            </button>
            <button 
              className={`nav-btn ${activeTab === 'stories' ? 'active' : ''}`}
              onClick={() => setActiveTab('stories')}
            >
              Stories/Journal
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="admin-main">
        <div className="admin-container">
          
          {/* Notifications */}
          {successMsg && <div className="toast success">{successMsg}</div>}
          {errorMsg && <div className="toast error">{errorMsg}</div>}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="tab-content dashboard-tab">
              <h2 className="tab-title">Studio Overview</h2>
              
              <div className="stats-grid">
                <div className="stat-card" onClick={() => setActiveTab('portfolio')}>
                  <span className="stat-label">Portfolio Media</span>
                  <span className="stat-value">{loadingPortfolio ? '...' : portfolioItems.length}</span>
                  <span className="stat-link">Manage Media &rarr;</span>
                </div>
                <div className="stat-card" onClick={() => setActiveTab('stories')}>
                  <span className="stat-label">Published Stories</span>
                  <span className="stat-value">{loadingStories ? '...' : stories.length}</span>
                  <span className="stat-link">Manage Journal &rarr;</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Weddings</span>
                  <span className="stat-value">
                    {portfolioItems.filter(item => item.category === 'weddings').length}
                  </span>
                  <span className="stat-subtitle">Images in gallery</span>
                </div>
                <div className="stat-card">
                  <span className="stat-label">Portraits</span>
                  <span className="stat-value">
                    {portfolioItems.filter(item => item.category === 'portraits').length}
                  </span>
                  <span className="stat-subtitle">Images in gallery</span>
                </div>
              </div>

              <div className="info-block">
                <h3>Jamstack & Git Workflow Guide</h3>
                <p>
                  This system works in a <strong>decoupled mode</strong>. Changes you make here are immediately written to your local project database files:
                </p>
                <ul>
                  <li>Portfolio items database: <code>assets/data/portfolio.json</code></li>
                  <li>Journal/Stories database: <code>assets/data/stories.json</code></li>
                  <li>Compressed WebP image files: <code>assets/portfolio/</code></li>
                </ul>
                <p>
                  To push these updates to your live public website, simply perform a <strong>git commit</strong> and <strong>push</strong>. The static site hosted on GitHub Pages will instantly update with your changes!
                </p>
              </div>
            </div>
          )}

          {/* PORTFOLIO TAB */}
          {activeTab === 'portfolio' && (
            <div className="tab-content portfolio-tab">
              <div className="split-view">
                {/* Form column */}
                <div className="form-column">
                  <h3 className="section-title">Upload New Photo</h3>
                  <form onSubmit={handlePortfolioSubmit} className="admin-form">
                    <div className="form-group">
                      <label htmlFor="port-title">Photo Title</label>
                      <input 
                        type="text" 
                        id="port-title"
                        value={portTitle}
                        onChange={(e) => setPortTitle(e.target.value)}
                        placeholder="e.g. The Golden Promise"
                        required 
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="port-category">Category</label>
                        <select 
                          id="port-category"
                          value={portCategory}
                          onChange={(e) => setPortCategory(e.target.value)}
                        >
                          <option value="weddings">Weddings</option>
                          <option value="couples">Couples</option>
                          <option value="portraits">Portraits</option>
                          <option value="events">Events</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label htmlFor="port-aspect">Aspect Ratio</label>
                        <select 
                          id="port-aspect"
                          value={portAspect}
                          onChange={(e) => setPortAspect(e.target.value)}
                        >
                          <option value="standard">Standard (Square/4:3)</option>
                          <option value="wide">Wide (Landscape 16:9)</option>
                          <option value="tall">Tall (Portrait 3:4)</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="portfolio-file-input">Select Image</label>
                      <input 
                        type="file" 
                        id="portfolio-file-input"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setPortFile(e.target.files ? e.target.files[0] : null)}
                        required 
                      />
                      <span className="help-text">JPG, PNG or WebP. Automatically converted and compressed.</span>
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-gold" 
                      disabled={portSubmitting}
                    >
                      {portSubmitting ? 'Uploading & Compressing...' : 'Add to Portfolio'}
                    </button>
                  </form>
                </div>

                {/* List column */}
                <div className="list-column">
                  <h3 className="section-title">Active Portfolio Grid ({portfolioItems.length})</h3>
                  {loadingPortfolio ? (
                    <div className="spinner">Loading portfolio items...</div>
                  ) : (
                    <div className="admin-portfolio-grid">
                      {portfolioItems.map((item) => (
                        <div key={item.id} className="admin-portfolio-card">
                          <div className="thumb-box">
                            <img src={`${API_BASE}/${item.imageUrl}`} alt={item.title} />
                          </div>
                          <div className="card-details">
                            <h4 className="card-title">{item.title}</h4>
                            <div className="card-meta">
                              <span className="tag">{item.category}</span>
                              <span className="tag-aspect">{item.aspect}</span>
                            </div>
                            <button 
                              onClick={() => handleDeletePortfolio(item.id, item.title)}
                              className="btn-danger"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STORIES TAB */}
          {activeTab === 'stories' && (
            <div className="tab-content stories-tab">
              <div className="split-view">
                {/* Form column */}
                <div className="form-column">
                  <h3 className="section-title">Publish a New Story</h3>
                  <form onSubmit={handleStorySubmit} className="admin-form">
                    <div className="form-group">
                      <label htmlFor="story-title">Story Title</label>
                      <input 
                        type="text" 
                        id="story-title"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        placeholder="e.g. A Golden Promise in Asaba"
                        required 
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="story-category">Category</label>
                        <input 
                          type="text" 
                          id="story-category"
                          value={storyCategory}
                          onChange={(e) => setStoryCategory(e.target.value)}
                          placeholder="e.g. Weddings or Portraits"
                          required 
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="story-date">Date</label>
                        <input 
                          type="date" 
                          id="story-date"
                          value={storyDate}
                          onChange={(e) => setStoryDate(e.target.value)}
                          required 
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="story-file-input">Cover Image (Optional)</label>
                      <input 
                        type="file" 
                        id="story-file-input"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => setStoryFile(e.target.files ? e.target.files[0] : null)}
                      />
                      <span className="help-text">If not provided, a default placeholder is used.</span>
                    </div>

                    <div className="form-group">
                      <label htmlFor="story-excerpt">Excerpt / Summary</label>
                      <textarea 
                        id="story-excerpt"
                        value={storyExcerpt}
                        onChange={(e) => setStoryExcerpt(e.target.value)}
                        placeholder="Brief 1-2 sentence description shown in cards..."
                        rows={2}
                        required 
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="story-content">Story Text (Separate paragraphs with double Enter)</label>
                      <textarea 
                        id="story-content"
                        value={storyContent}
                        onChange={(e) => setStoryContent(e.target.value)}
                        placeholder="Tell the full narrative of the shoot here..."
                        rows={8}
                        required 
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-gold" 
                      disabled={storySubmitting}
                    >
                      {storySubmitting ? 'Publishing...' : 'Publish Story'}
                    </button>
                  </form>
                </div>

                {/* List column */}
                <div className="list-column">
                  <h3 className="section-title">Published Stories ({stories.length})</h3>
                  {loadingStories ? (
                    <div className="spinner">Loading stories...</div>
                  ) : (
                    <div className="admin-stories-list">
                      {stories.map((story) => (
                        <div key={story.id} className="admin-story-card">
                          <div className="thumb-box-wide">
                            <img src={`${API_BASE}/${story.coverImage}`} alt={story.title} />
                          </div>
                          <div className="story-details">
                            <h4 className="story-title">{story.title}</h4>
                            <span className="story-date">{story.date} | {story.category}</span>
                            <p className="story-excerpt">{story.excerpt}</p>
                            <button 
                              onClick={() => handleDeleteStory(story.id, story.title)}
                              className="btn-danger"
                            >
                              Delete Story
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="admin-container">
          <p>&copy; 2026 Nonimedia Production Concept. Local CMS Dashboard.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
