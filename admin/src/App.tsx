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

interface PricePackage {
  id: string;
  name: string;
  price: number;
}

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-US')}`;
const parsePriceInput = (value: string) => Number(value.replace(/[^\d]/g, ''));

const DEFAULT_API_BASE = 'http://127.0.0.1:8000';
const TOKEN_KEY = 'nonimedia_admin_token';
const TOKEN_EXP_KEY = 'nonimedia_admin_token_exp';
const SESSION_EXPIRED_MSG = 'Your session has expired. Please sign in again.';

function readStoredToken(): string | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const expiresAt = Number(localStorage.getItem(TOKEN_EXP_KEY) || 0);
    if (token && expiresAt * 1000 > Date.now()) return token;
  } catch {
    // Storage unavailable (private mode etc.) - user just signs in again
  }
  return null;
}

function storeToken(token: string | null, expiresAt?: number) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(TOKEN_EXP_KEY, String(expiresAt ?? 0));
    } else {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(TOKEN_EXP_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'portfolio' | 'stories' | 'packages'>('dashboard');
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [packages, setPackages] = useState<PricePackage[]>([]);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [savingPackageId, setSavingPackageId] = useState<string | null>(null);
  
  // API URL State
  const [apiUrl, setApiUrl] = useState(() => {
    return localStorage.getItem('nonimedia_api_url') || DEFAULT_API_BASE;
  });

  // Auth State
  const [token, setToken] = useState<string | null>(() => readStoredToken());
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

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

  // Auth Helpers
  const signOut = (message?: string) => {
    storeToken(null);
    setToken(null);
    setLoginPassword('');
    setLoginError(message || '');
  };

  // fetch() wrapper for protected endpoints: sends the token, signs out on 401
  const authFetch = async (url: string, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401) {
      signOut(SESSION_EXPIRED_MSG);
      throw new Error(SESSION_EXPIRED_MSG);
    }
    return res;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPassword) {
      setLoginError('Please enter the admin password.');
      return;
    }
    setLoggingIn(true);
    setLoginError('');
    try {
      const res = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Sign in failed.');
      }
      storeToken(data.token, data.expiresAt);
      setToken(data.token);
      setLoginPassword('');
    } catch (err: any) {
      setLoginError(
        err instanceof TypeError
          ? `Could not reach the API server at ${apiUrl}. Check the address and that the backend is running.`
          : err.message || 'Sign in failed.'
      );
    } finally {
      setLoggingIn(false);
    }
  };

  // Confirm a saved session is still valid on this server
  useEffect(() => {
    if (!token) return;
    fetch(`${apiUrl}/api/session`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        if (res.status === 401) signOut(SESSION_EXPIRED_MSG);
      })
      .catch(() => {
        // Server unreachable - the data loaders show that error
      });
  }, [token, apiUrl]);

  // Fetch Data
  const fetchPortfolio = async () => {
    setLoadingPortfolio(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiUrl}/api/portfolio`);
      if (res.ok) {
        const data = await res.json();
        setPortfolioItems(data);
      } else {
        throw new Error('Failed to fetch portfolio');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Could not connect to API server at ${apiUrl}. Make sure your cloud backend is active and running.`);
    } finally {
      setLoadingPortfolio(false);
    }
  };

  const fetchStories = async () => {
    setLoadingStories(true);
    setErrorMsg('');
    try {
      const res = await fetch(`${apiUrl}/api/stories`);
      if (res.ok) {
        const data = await res.json();
        setStories(data);
      } else {
        throw new Error('Failed to fetch stories');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Could not connect to API server at ${apiUrl}. Make sure your cloud backend is active and running.`);
    } finally {
      setLoadingStories(false);
    }
  };

  const fetchPackages = async () => {
    setLoadingPackages(true);
    try {
      const res = await fetch(`${apiUrl}/api/packages`);
      if (!res.ok) throw new Error('Failed to fetch packages');
      const data: PricePackage[] = await res.json();
      setPackages(data);
      setPriceDrafts(Object.fromEntries(data.map((pkg) => [pkg.id, String(pkg.price)])));
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Could not load package prices from ${apiUrl}. Make sure your backend is running the latest version.`);
    } finally {
      setLoadingPackages(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchPortfolio();
    fetchStories();
    fetchPackages();
  }, [apiUrl, token]);

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
      const res = await authFetch(`${apiUrl}/api/portfolio`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const newItem = await res.json();
        setPortfolioItems((prev) => [...prev, newItem]);
        setPortTitle('');
        setPortFile(null);
        const fileInput = document.getElementById('portfolio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        handleMessage('success', `Successfully uploaded "${portTitle}" to database and compressed to WebP!`);
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
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will remove the image file.`)) {
      return;
    }

    try {
      const res = await authFetch(`${apiUrl}/api/portfolio/${id}`, {
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
      handleMessage('error', err.message === SESSION_EXPIRED_MSG ? err.message : 'Error deleting portfolio item.');
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
      const res = await authFetch(`${apiUrl}/api/stories`, {
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
      const res = await authFetch(`${apiUrl}/api/stories/${id}`, {
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
      handleMessage('error', err.message === SESSION_EXPIRED_MSG ? err.message : 'Error deleting story.');
    }
  };

  // Update a package price
  const handleSavePrice = async (pkg: PricePackage) => {
    const price = parsePriceInput(priceDrafts[pkg.id] ?? '');
    if (!price || price <= 0) {
      handleMessage('error', 'Please enter a valid price in Naira, e.g. 350000.');
      return;
    }

    setSavingPackageId(pkg.id);
    try {
      const res = await authFetch(`${apiUrl}/api/packages/${pkg.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update price');
      }
      setPackages((prev) => prev.map((p) => (p.id === pkg.id ? data : p)));
      setPriceDrafts((prev) => ({ ...prev, [pkg.id]: String(data.price) }));
      handleMessage('success', `${data.name} is now ${formatNaira(data.price)}.`);
    } catch (err: any) {
      console.error(err);
      handleMessage('error', err.message || 'Error updating price.');
    } finally {
      setSavingPackageId(null);
    }
  };

  if (!token) {
    return (
      <div className="login-screen">
        <form className="login-card admin-form" onSubmit={handleLogin}>
          <div className="login-brand">
            <h1 className="logo">NONIMEDIA <span>CONCEPT</span></h1>
            <span className="badge">Admin Portal</span>
          </div>
          <p className="login-intro">Sign in to manage the portfolio and journal.</p>

          {loginError && <div className="login-error" role="alert">{loginError}</div>}

          <div className="form-group">
            <label htmlFor="login-password">Admin Password</label>
            <input
              type="password"
              id="login-password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-api-url">API Endpoint</label>
            <input
              type="text"
              id="login-api-url"
              value={apiUrl}
              onChange={(e) => {
                setApiUrl(e.target.value);
                localStorage.setItem('nonimedia_api_url', e.target.value);
              }}
              placeholder="http://127.0.0.1:8000"
              spellCheck={false}
            />
            <span className="help-text">The address of the Nonimedia backend server.</span>
          </div>

          <button type="submit" className="btn btn-gold" disabled={loggingIn}>
            {loggingIn ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-app">
      {/* Header */}
      <header className="admin-header">
        <div className="admin-container header-flex">
          <div className="logo-group" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
            <h1 className="logo">NONIMEDIA <span>CONCEPT</span></h1>
            <span className="badge">Admin Portal</span>
            
            {/* Live API Configurator */}
            <div className="api-config" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(212, 175, 55, 0.05)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '0.2rem 0.6rem' }}>
              <label htmlFor="api-url-input" style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--accent)', letterSpacing: '0.05em', cursor: 'pointer' }}>API Endpoint:</label>
              <input 
                type="text" 
                id="api-url-input" 
                value={apiUrl} 
                onChange={(e) => {
                  setApiUrl(e.target.value);
                  localStorage.setItem('nonimedia_api_url', e.target.value);
                }} 
                style={{ background: 'none', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', width: '220px', outline: 'none', fontFamily: 'monospace' }}
                placeholder="http://127.0.0.1:8000"
              />
            </div>
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
            <button 
              className={`nav-btn ${activeTab === 'packages' ? 'active' : ''}`}
              onClick={() => setActiveTab('packages')}
            >
              Packages
            </button>
            <button
              className="nav-btn nav-btn-signout"
              onClick={() => signOut()}
            >
              Sign Out
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
                  <span className="stat-label">Bridal Portraits</span>
                  <span className="stat-value">
                    {portfolioItems.filter(item => item.category === 'bridal-portraits').length}
                  </span>
                  <span className="stat-subtitle">Images in gallery</span>
                </div>
              </div>

              <div className="info-block">
                <h3>Jamstack & Cloud-Hosted API Workflow Guide</h3>
                <p>
                  Your admin panel is now prepared for **cloud hosting**. When running live (e.g. hosted on Render), it writes additions directly to GitHub via the API:
                </p>
                <ul>
                  <li><strong>API Endpoint:</strong> Enter your live backend URL (e.g., <code>https://nonimedia-cms.onrender.com</code>) in the input header above.</li>
                  <li><strong>GitHub Commits:</strong> Edits automatically trigger background commits to your repository under <code>assets/data/</code> and <code>assets/portfolio/</code>.</li>
                  <li><strong>Auto-Rebuild:</strong> Commits automatically trigger GitHub Pages to deploy your live website instantly.</li>
                </ul>
                <p>
                  To set up your live cloud backend on Render, simply create a new service, set <code>ADMIN_PASSWORD</code>, <code>GITHUB_TOKEN</code>, <code>GITHUB_OWNER</code>, and <code>GITHUB_REPO</code> in the environment variables, and the API will handle the rest!
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
                          <option value="pre-wedding">Pre wedding</option>
                          <option value="bridal-portraits">Bridal portraits</option>
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
                            <img src={`${apiUrl}/${item.imageUrl}`} alt={item.title} />
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
                            <img src={`${apiUrl}/${story.coverImage}`} alt={story.title} />
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

          {/* PACKAGES TAB */}
          {activeTab === 'packages' && (
            <div className="tab-content packages-tab">
              <h2 className="tab-title">Package Prices</h2>
              <p className="tab-intro">
                New prices show on the Home, Packages and Contact pages as soon as the website updates.
              </p>

              {loadingPackages ? (
                <div className="spinner">Loading packages...</div>
              ) : (
                <div className="packages-admin-grid">
                  {packages.map((pkg) => {
                    const draft = priceDrafts[pkg.id] ?? '';
                    const draftPrice = parsePriceInput(draft);
                    const unchanged = draftPrice === pkg.price;
                    const saving = savingPackageId === pkg.id;
                    return (
                      <form
                        key={pkg.id}
                        className="admin-form package-price-card"
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSavePrice(pkg);
                        }}
                      >
                        <h3 className="card-title">{pkg.name}</h3>
                        <span className="current-price">{formatNaira(pkg.price)}</span>

                        <div className="form-group">
                          <label htmlFor={`price-${pkg.id}`}>New Price (₦)</label>
                          <input
                            type="text"
                            inputMode="numeric"
                            id={`price-${pkg.id}`}
                            value={draft}
                            onChange={(e) => setPriceDrafts((prev) => ({ ...prev, [pkg.id]: e.target.value }))}
                            placeholder="e.g. 350000"
                          />
                          <span className="help-text">
                            {draftPrice > 0 ? `Shows on the site as ${formatNaira(draftPrice)}` : 'Numbers only, e.g. 350000'}
                          </span>
                        </div>

                        <button type="submit" className="btn btn-gold" disabled={saving || unchanged || draftPrice <= 0}>
                          {saving ? 'Saving...' : 'Save Price'}
                        </button>
                      </form>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="admin-footer">
        <div className="admin-container">
          <p>&copy; 2026 Nonimedia Production Concept. Cloud CMS Dashboard.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
