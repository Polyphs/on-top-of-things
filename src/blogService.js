import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

let supabase = null;
let dbAvailable = false;

// Try to initialize Supabase, but handle gracefully if not configured
try {
  if (supabaseUrl !== 'https://your-project.supabase.co' && supabaseKey !== 'your-anon-key') {
    supabase = createClient(supabaseUrl, supabaseKey);
    dbAvailable = true;
  }
} catch (error) {
  console.warn('Supabase not available, using static posts:', error.message);
  dbAvailable = false;
}

// Static fallback posts
const staticPosts = [
  {
    id: 1,
    title: "Act on What Matters, NOW!",
    excerpt: "Todo lists capture \"what you want to do\". OT² helps you act on what you actually need to do—right now.",
    date: "Apr 20, 2026",
    readTime: "6 min read",
    category: "Productivity",
    slug: "act-on-what-matters",
    content: `
      <h2>Todo lists capture "what you want to do". OT² goes further.</h2>
      <p>We've all been there. You open your todo list app, feel the initial rush of accomplishment as you brain-dump tasks, and then... nothing happens.</p>
      <p>The list sits there, growing longer with every passing day. More tasks pile up. More guilt accumulates. More overwhelm sets in.</p>
      <p>Here's the uncomfortable truth: <strong>todo lists are good at capturing intentions, not at driving action</strong>.</p>
    `
  },
  {
    id: 2,
    title: "Systems Beat Goals",
    excerpt: "\"You do not rise to the level of your goals. You fall to the level of your systems.\" — James Clear",
    date: "Apr 18, 2026",
    readTime: "7 min read",
    category: "Systems",
    slug: "systems-beat-goals",
    content: `
      <h2>"You do not rise to the level of your goals. You fall to the level of your systems." — James Clear</h2>
      <p>This quote changed everything for me. And it should change how you think about your productivity forever.</p>
      <p>Because here's the brutal truth: <strong>without a system, goals are just wishes</strong>.</p>
    `
  },
  {
    id: 3,
    title: "Your Personal Coach, Always With You",
    excerpt: "Stop wasting thousands on coaching programs. Get Socrates as your personal 1-1 coach, always accessible.",
    date: "Apr 16, 2026",
    readTime: "7 min read",
    category: "Coaching",
    slug: "personal-coach-always",
    content: `
      <h2>You need a coach. But you don't need to pay thousands and then fall back to old ways.</h2>
      <p>The concept is familiar and proven. You identify a gap in your performance. You sign up for a coaching program—life coaching, career coaching, productivity coaching.</p>
    `
  }
];

// Blog posts service
export const blogService = {
  // Get all blog posts
  async getPosts() {
    if (!dbAvailable) {
      console.log('Using static blog posts (database not available)');
      return staticPosts;
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching posts from database, falling back to static:', error);
      return staticPosts;
    }
  },

  // Get a single post by ID
  async getPost(id) {
    if (!dbAvailable) {
      return staticPosts.find(post => post.id === id) || null;
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching post from database, checking static:', error);
      return staticPosts.find(post => post.id === id) || null;
    }
  },

  // Create a new post
  async createPost(postData) {
    if (!dbAvailable) {
      console.warn('Database not available - cannot create post');
      throw new Error('Database not available. Please configure Supabase to create posts.');
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .insert([postData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  },

  // Update an existing post
  async updatePost(id, postData) {
    if (!dbAvailable) {
      console.warn('Database not available - cannot update post');
      throw new Error('Database not available. Please configure Supabase to update posts.');
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .update(postData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  // Delete a post
  async deletePost(id) {
    if (!dbAvailable) {
      console.warn('Database not available - cannot delete post');
      throw new Error('Database not available. Please configure Supabase to delete posts.');
    }

    try {
      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  // Get posts by category
  async getPostsByCategory(category) {
    if (!dbAvailable) {
      return staticPosts.filter(post => post.category === category);
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('category', category)
        .order('date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching posts by category from database, checking static:', error);
      return staticPosts.filter(post => post.category === category);
    }
  },

  // Check if database is available
  isDatabaseAvailable() {
    return dbAvailable;
  }
};

export default blogService;
