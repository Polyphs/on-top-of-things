# OT² Blog Database Setup

This guide explains how to set up the database integration for the OT² blog system.

## Prerequisites

1. A Supabase account (free tier is sufficient)
2. Node.js and npm installed

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your project URL and anon key from Settings → API

### 2. Set Up Database Table

1. In your Supabase dashboard, go to the SQL Editor
2. Copy and run the contents of `blog-schema.sql`
3. This will create the `blog_posts` table with proper indexes and security policies

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 4. Run the Application

```bash
npm install
npm run dev
```

## URL Structure

The application now supports the following URLs:

- **Home Page**: `http://localhost:5173/ot2/`
- **Blog**: `http://localhost:5173/ot2/blog`
- **App**: `http://localhost:5173/ot2/app/` (requires access code: `ot2-2026`)
- **Admin**: `http://localhost:5173/ot2/admin` (blog CMS)

## Blog CMS Features

The blog CMS at `/ot2/admin` provides:

- ✅ Create, edit, and delete blog posts
- ✅ Real-time database synchronization
- ✅ Category organization
- ✅ Search functionality
- ✅ Export posts as JSON
- ✅ Generate static HTML for deployment

## Database Schema

The `blog_posts` table includes:

- `id`: Auto-incrementing primary key
- `title`: Post title
- `excerpt`: Brief summary for list views
- `content`: Full HTML content
- `date`: Publication date
- `read_time`: Estimated reading time
- `category`: Post category
- `slug`: URL-friendly identifier
- `created_at/updated_at`: Timestamps

## Security

- Row Level Security (RLS) is enabled
- Public read access for all users
- Authenticated users only can write (create/update/delete)
- For production, you may want to implement additional authentication

## Deployment

For production deployment:

1. Set your environment variables in your hosting platform
2. Ensure your Supabase project is configured for production
3. The blog will automatically sync with the database
4. Use the CMS "Generate Blog HTML" feature if you need static files

## Troubleshooting

### Blog posts not loading
- Check your Supabase URL and keys in `.env.local`
- Ensure the database table was created successfully
- Check browser console for error messages

### CMS not saving posts
- Verify your Supabase project allows write operations
- Check RLS policies in Supabase dashboard
- Ensure you're authenticated (if required)

### Access code not working
- Default access code is: `ot2-2026`
- You can change this in `src/App.jsx` (line 9)

## Support

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase configuration
3. Ensure all environment variables are set correctly
4. Run the SQL schema setup again if needed
