import React, { useState, useEffect } from 'react';
import blogService from './blogService.js';

export default function BlogCMSEnhanced() {
  const [view, setView] = useState('list'); // list, edit, new, settings
  const [editingPost, setEditingPost] = useState(null);
  const [posts, setPosts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    title: '',
    excerpt: '',
    date: new Date().toISOString().split('T')[0],
    readTime: '5 min read',
    category: 'Productivity',
    slug: '',
    content: ''
  });

  const categories = [
    'Productivity', 'Systems', 'Coaching', 'Getting Started', 'AI Philosophy',
    'Mental Clarity', 'Habit Building', 'Resilience', 'Action & Execution', 'Systems Integration',
    'Commitment & Accountability', 'Action & Intuition', 'Mastery & Depth'
  ];

  // Load posts from database on mount
  useEffect(() => {
    const loadPosts = async () => {
      setLoading(true);
      try {
        const fetchedPosts = await blogService.getPosts();
        setPosts(fetchedPosts);
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && { slug: generateSlug(value) })
    }));
  };

  const handleSavePost = async () => {
    if (!formData.title || !formData.content) {
      alert('Please fill in title and content');
      return;
    }

    setLoading(true);
    try {
      if (formData.id) {
        // Update existing post
        const updatedPost = await blogService.updatePost(formData.id, formData);
        setPosts(posts.map(p => p.id === formData.id ? updatedPost : p));
        alert('Post updated successfully!');
      } else {
        // Create new post
        const newPost = await blogService.createPost(formData);
        setPosts([...posts, newPost]);
        alert('Post created successfully!');
      }
      setView('list');
      resetForm();
    } catch (error) {
      console.error('Error saving post:', error);
      alert('Error saving post. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: null,
      title: '',
      excerpt: '',
      date: new Date().toISOString().split('T')[0],
      readTime: '5 min read',
      category: 'Productivity',
      slug: '',
      content: ''
    });
  };

  const handleEditPost = (post) => {
    setEditingPost(post);
    setFormData(post);
    setView('edit');
  };

  const handleDeletePost = async (id) => {
    if (window.confirm('Are you sure you want to delete this post?')) {
      setLoading(true);
      try {
        await blogService.deletePost(id);
        setPosts(posts.filter(p => p.id !== id));
        alert('Post deleted successfully!');
      } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post. Please try again.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleNewPost = () => {
    setEditingPost(null);
    resetForm();
    setView('new');
  };

  const exportPosts = () => {
    const dataStr = JSON.stringify(posts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ot2_blog_posts_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    setShowExportModal(false);
    alert('Posts exported successfully!');
  };

  const generateBlogHTML = () => {
    const postsHTML = posts.map(post => `
      <article class="blog-post" style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e0e0e0; margin-bottom: 2rem;">
        <header>
          <h1 style="font-size: 2rem; font-weight: 600; color: #1a1a1a; margin-bottom: 1rem;">${post.title}</h1>
          <div style="display: flex; gap: 1rem; margin-bottom: 1.5rem; color: #666; font-size: 0.9rem;">
            <span>${post.date}</span>
            <span>•</span>
            <span>${post.readTime}</span>
            <span>•</span>
            <span style="background: #f0f0f0; padding: 0.25rem 0.75rem; border-radius: 4px;">${post.category}</span>
          </div>
          <p style="font-size: 1.1rem; color: #666; line-height: 1.6; margin-bottom: 2rem;">${post.excerpt}</p>
        </header>
        <div class="post-content" style="line-height: 1.7; color: #333;">
          ${post.content}
        </div>
      </article>
    `).join('');

    const fullHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OT² Blog - Insights on Mindful Productivity</title>
  <meta name="description" content="Discover insights on mindful productivity, Socratic coaching, and building systems that work.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", sans-serif; 
      line-height: 1.6; 
      color: #333; 
      background: #f8f9fa; 
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      padding: 2rem; 
    }
    .blog-post { 
      background: white; 
      padding: 2rem; 
      border-radius: 12px; 
      border: 1px solid #e0e0e0; 
      margin-bottom: 2rem; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    h1 { font-size: 2rem; font-weight: 600; color: #1a1a1a; margin-bottom: 1rem; }
    h2 { font-size: 1.5rem; font-weight: 600; color: #1a1a1a; margin: 2rem 0 1rem 0; }
    h3 { font-size: 1.2rem; font-weight: 600; color: #1a1a1a; margin: 1.5rem 0 0.5rem 0; }
    p { margin-bottom: 1rem; color: #333; }
    ul, ol { margin: 1rem 0; padding-left: 2rem; }
    li { margin-bottom: 0.5rem; }
    strong { color: #0891b2; font-weight: 600; }
    em { font-style: italic; }
    .post-meta { 
      display: flex; 
      gap: 1rem; 
      margin-bottom: 1.5rem; 
      color: #666; 
      font-size: 0.9rem; 
    }
    .category { 
      background: #f0f0f0; 
      padding: 0.25rem 0.75rem; 
      border-radius: 4px; 
    }
    .excerpt { 
      font-size: 1.1rem; 
      color: #666; 
      line-height: 1.6; 
      margin-bottom: 2rem; 
    }
    @media (max-width: 768px) {
      .container { padding: 1rem; }
      .blog-post { padding: 1.5rem; }
      h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    ${postsHTML}
  </div>
</body>
</html>`;

    const blob = new Blob([fullHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blog.htm';
    link.click();
    URL.revokeObjectURL(url);
    alert('Blog HTML generated! Upload this file to replace blog.htm');
  };

  const importPosts = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          setPosts([...posts, ...imported]);
          alert(`${imported.length} posts imported successfully!`);
        } else {
          alert('Invalid file format. Please import a valid JSON file.');
        }
      } catch (error) {
        alert('Error reading file: ' + error.message);
      }
    };
    reader.readAsText(file);
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    post.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const postStats = {
    total: posts.length,
    byCategory: categories.reduce((acc, cat) => ({
      ...acc,
      [cat]: posts.filter(p => p.category === cat).length
    }), {})
  };

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif', minHeight: '100vh', background: '#f5f5f5' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        .cms-navbar {
          background: white;
          border-bottom: 1px solid #ddd;
          padding: 1rem 2rem;
          position: sticky;
          top: 0;
          z-index: 10;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .cms-nav-container {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .cms-nav-brand {
          font-size: 20px;
          font-weight: 600;
          background: linear-gradient(135deg, #0369a1, #0891b2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .cms-container {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 2rem;
        }

        .cms-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
        }

        .cms-header h1 {
          font-size: 1.8rem;
          color: #1a1a1a;
        }

        .header-actions {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 0.9rem;
        }

        .btn-primary {
          background: linear-gradient(135deg, #0369a1, #0891b2);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(6, 105, 161, 0.2);
        }

        .btn-secondary {
          background: #f0f0f0;
          color: #333;
        }

        .btn-secondary:hover {
          background: #e0e0e0;
        }

        .btn-danger {
          background: #f44336;
          color: white;
          padding: 0.5rem 1rem;
          font-size: 0.85rem;
        }

        .btn-danger:hover {
          background: #da190b;
        }

        .search-bar {
          width: 100%;
          padding: 0.75rem 1rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 0.95rem;
          margin-bottom: 1.5rem;
        }

        .search-bar:focus {
          outline: none;
          border-color: #0891b2;
          box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
        }

        .posts-grid-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          text-align: center;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 600;
          background: linear-gradient(135deg, #0369a1, #0891b2);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .stat-label {
          font-size: 0.85rem;
          color: #999;
          margin-top: 0.5rem;
        }

        .posts-table {
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th {
          background: #f8f9fa;
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #1a1a1a;
          border-bottom: 2px solid #eee;
        }

        td {
          padding: 1rem;
          border-bottom: 1px solid #eee;
        }

        tr:hover {
          background: #f8f9fa;
        }

        .post-title {
          font-weight: 600;
          color: #0891b2;
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .post-actions {
          display: flex;
          gap: 0.5rem;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          font-weight: 600;
          margin-bottom: 0.5rem;
          color: #1a1a1a;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-family: inherit;
          font-size: 0.95rem;
        }

        .form-group textarea {
          min-height: 300px;
          resize: vertical;
          font-family: 'Monaco', 'Courier New', monospace;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #0891b2;
          box-shadow: 0 0 0 3px rgba(8, 145, 178, 0.1);
        }

        .form-container {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .form-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 2rem;
        }

        .editor-hint {
          font-size: 0.85rem;
          color: #999;
          margin-top: 0.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 2rem;
          color: #999;
        }

        .empty-state h2 {
          color: #1a1a1a;
          margin-bottom: 1rem;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          font-size: 1.3rem;
          font-weight: 600;
          margin-bottom: 1rem;
          color: #1a1a1a;
        }

        .modal-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .file-input-wrapper {
          position: relative;
          overflow: hidden;
          display: inline-block;
        }

        .file-input-wrapper input[type="file"] {
          position: absolute;
          left: -9999px;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.75rem;
          background: #f0f0f0;
          border-radius: 4px;
          font-size: 0.85rem;
          color: #666;
        }
      `}</style>

      {/* Navigation */}
      <div className="cms-navbar">
        <div className="cms-nav-container">
          <div className="cms-nav-brand">📝 OT² Blog Admin</div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-secondary" onClick={() => setView('settings')}>⚙️ Settings</button>
            <button className="btn btn-secondary" onClick={() => setView('list')}>📋 All Posts</button>
            <a href="https://algai.app/ot2/blog" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">👁️ View Blog</a>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="cms-container">

        {/* LIST VIEW */}
        {view === 'list' && (
          <>
            <div className="cms-header">
              <h1>Blog Posts ({filteredPosts.length})</h1>
              <div className="header-actions">
                <button className="btn btn-primary" onClick={handleNewPost}>+ New Post</button>
              </div>
            </div>

            <input
              type="text"
              className="search-bar"
              placeholder="🔍 Search posts by title or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* Stats */}
            {posts.length > 0 && (
              <div className="posts-grid-stats">
                <div className="stat-card">
                  <div className="stat-number">{posts.length}</div>
                  <div className="stat-label">Total Posts</div>
                </div>
                {Object.entries(postStats.byCategory).filter(([, count]) => count > 0).slice(0, 3).map(([cat, count]) => (
                  <div key={cat} className="stat-card">
                    <div className="stat-number">{count}</div>
                    <div className="stat-label">{cat}</div>
                  </div>
                ))}
              </div>
            )}

            {filteredPosts.length > 0 ? (
              <div className="posts-table">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Read Time</th>
                      <th style={{ width: '200px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPosts.map(post => (
                      <tr key={post.id}>
                        <td className="post-title">{post.title}</td>
                        <td><span className="badge">{post.category}</span></td>
                        <td>{post.date}</td>
                        <td>{post.readTime}</td>
                        <td>
                          <div className="post-actions">
                            <button className="btn btn-secondary" onClick={() => handleEditPost(post)}>Edit</button>
                            <button className="btn btn-danger" onClick={() => handleDeletePost(post.id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <h2>No blog posts yet</h2>
                <p>{searchQuery ? 'No posts match your search' : 'Create your first blog post to get started!'}</p>
                {!searchQuery && <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleNewPost}>Create First Post</button>}
              </div>
            )}
          </>
        )}

        {/* NEW/EDIT VIEW */}
        {(view === 'new' || view === 'edit') && (
          <>
            <div className="cms-header">
              <h1>{view === 'new' ? '✍️ Create New Post' : '✏️ Edit Post'}</h1>
            </div>

            <div className="form-container">
              <div className="form-group">
                <label htmlFor="title">Post Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Enter post title"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="slug">Slug</label>
                  <input
                    type="text"
                    id="slug"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    placeholder="auto-generated"
                    readOnly
                    style={{ background: '#f5f5f5' }}
                  />
                  <div className="editor-hint">Auto-generated from title</div>
                </div>

                <div className="form-group">
                  <label htmlFor="date">Publication Date</label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="readTime">Read Time</label>
                  <input
                    type="text"
                    id="readTime"
                    name="readTime"
                    value={formData.readTime}
                    onChange={handleInputChange}
                    placeholder="e.g., 5 min read"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="excerpt">Excerpt (displayed in list view) *</label>
                <input
                  type="text"
                  id="excerpt"
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleInputChange}
                  placeholder="Brief summary of the post"
                  required
                />
                <div className="editor-hint">Keep it under 150 characters. Current: {formData.excerpt.length}/150</div>
              </div>

              <div className="form-group">
                <label htmlFor="content">Post Content (HTML) *</label>
                <textarea
                  id="content"
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  placeholder="Enter post content in HTML format. Use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, etc."
                  required
                />
                <div className="editor-hint">HTML formatting supported. Example: &lt;h2&gt;Title&lt;/h2&gt; &lt;p&gt;Content here&lt;/p&gt;</div>
              </div>

              <div className="form-buttons">
                <button className="btn btn-primary" onClick={handleSavePost}>
                  {view === 'new' ? '✅ Create Post' : '💾 Update Post'}
                </button>
                <button className="btn btn-secondary" onClick={() => setView('list')}>Cancel</button>
              </div>
            </div>
          </>
        )}

        {/* SETTINGS VIEW */}
        {view === 'settings' && (
          <>
            <div className="cms-header">
              <h1>⚙️ Settings & Data Management</h1>
            </div>

            <div className="form-container">
              <h2 style={{ marginBottom: '1.5rem', color: '#1a1a1a' }}>📊 Blog Statistics</h2>
              
              <div className="posts-grid-stats" style={{ marginBottom: '2rem' }}>
                <div className="stat-card">
                  <div className="stat-number">{posts.length}</div>
                  <div className="stat-label">Total Posts</div>
                </div>
                {Object.entries(postStats.byCategory).filter(([, count]) => count > 0).map(([cat, count]) => (
                  <div key={cat} className="stat-card">
                    <div className="stat-number">{count}</div>
                    <div className="stat-label">{cat}</div>
                  </div>
                ))}
              </div>

              <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />

              <h2 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>💾 Data Management</h2>
              <p style={{ color: '#666', marginBottom: '1.5rem' }}>Your posts are stored in your browser's local storage. Back them up to keep them safe!</p>

              <div className="form-buttons" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                <button className="btn btn-primary" onClick={() => setShowExportModal(true)}>
                  📥 Export All Posts (JSON)
                </button>
                <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>Download all your posts as a JSON file for backup</p>
                
                <button className="btn btn-primary" onClick={generateBlogHTML} style={{ marginTop: '1rem' }}>
                  🌐 Generate Blog HTML (blog.htm)
                </button>
                <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>Generate static blog.htm file with all posts for deployment</p>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <label className="file-input-wrapper">
                  <button className="btn btn-secondary">📤 Import Posts (JSON)</button>
                  <input
                    type="file"
                    accept=".json"
                    onChange={importPosts}
                  />
                </label>
                <p style={{ fontSize: '0.85rem', color: '#999', marginTop: '0.5rem' }}>Import previously exported posts</p>
              </div>

              <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #eee' }} />

              <h2 style={{ marginBottom: '1rem', color: '#1a1a1a' }}>ℹ️ About This CMS</h2>
              <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '6px', color: '#666', lineHeight: '1.6' }}>
                <p><strong>Version:</strong> OT² Blog CMS v1.0</p>
                <p><strong>Storage:</strong> {blogService.isDatabaseAvailable() ? 'Supabase Database' : 'Static Posts (Database not configured)'}</p>
                <p><strong>Database Status:</strong> 
                  <span style={{ 
                    color: blogService.isDatabaseAvailable() ? '#22c55e' : '#f59e0b', 
                    fontWeight: 600 
                  }}>
                    {blogService.isDatabaseAvailable() ? ' ✅ Connected' : ' ⚠️ Not Available'}
                  </span>
                </p>
                <p><strong>Features:</strong> Create, edit, delete posts • Auto-slug generation • Category organization • {blogService.isDatabaseAvailable() ? 'Real-time sync' : 'Static fallback'}</p>
                {!blogService.isDatabaseAvailable() && (
                  <p style={{ color: '#f59e0b', fontSize: '0.9rem' }}>
                    <strong>Note:</strong> Configure Supabase to enable post creation, editing, and deletion. Currently showing static posts.
                  </p>
                )}
                <p><strong>Backup:</strong> {blogService.isDatabaseAvailable() ? 'Export posts as JSON backup' : 'Static posts - no backup needed'}</p>
              </div>

              <div className="form-buttons">
                <button className="btn btn-secondary" onClick={() => setView('list')}>Back to Posts</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">📥 Export Posts</div>
            <p style={{ color: '#666', marginBottom: '1rem', lineHeight: '1.6' }}>
              You're about to download all {posts.length} posts as a JSON file. This is perfect for:
            </p>
            <ul style={{ color: '#666', marginBottom: '1.5rem', paddingLeft: '1.5rem', lineHeight: '1.8' }}>
              <li>Backing up your content</li>
              <li>Migrating to another platform</li>
              <li>Importing into another blog</li>
            </ul>
            <div className="modal-buttons">
              <button className="btn btn-primary" onClick={exportPosts}>
                ✅ Export Now
              </button>
              <button className="btn btn-secondary" onClick={() => setShowExportModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '8px',
            textAlign: 'center',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0891b2',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 1rem'
            }}></div>
            <p style={{ color: '#666', fontSize: '16px', margin: 0 }}>Processing...</p>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </div>
      )}
    </div>
  );
}
