# FocusFlow - ADHD-Focused Task Management App

## Overview

FocusFlow is a specialized to-do list application designed for individuals with ADHD. The core philosophy is minimal distractions and focused engagement. The app features four distinct modes to help users capture, focus on, execute, and review their tasks.

## Key Features

### Four Modes
1. **Freedom Mode** - Quick task capture with minimal friction. Each task has a dedicated "Focus" button to immediately start focused work.
2. **Focus Mode** - One-task-at-a-time guided coaching wizard with questions about deadlines, outcome visualization, and motivation.
3. **Work Mode** - Structured table view showing all pending tasks with their reflection responses for execution clarity.
4. **Review & Learn Mode** - Analytics dashboard showing completion stats, average focus time, satisfaction ratings, and improvement tracking.

### Navigation
- Unified navigation bar visible on all screens (except landing) showing all four modes
- Mode navigation is gated - unauthenticated users are redirected to login

### Authentication
- Email-based signup with 6-digit OTP verification
- Login with email or profile name
- Forgot password flow with OTP-based reset
- Session-based authentication with secure cookie handling

### Task Features
- Focus time tracking (startedAt, completedAt, focusTimeSeconds)
- Per-task reflections from coaching questions
- Post-completion reviews with satisfaction ratings (1-5) and improvement notes

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for smooth transitions in focus mode wizard
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with reusable components. Key patterns:
- Custom hooks for data fetching (`use-auth.ts`, `use-tasks.ts`)
- Centralized API client in `queryClient.ts`
- Type-safe API contracts shared with backend via `@shared/routes.ts`

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **Session Management**: express-session with MemoryStore (development) / connect-pg-simple (production ready)
- **Password Hashing**: bcrypt
- **Email Service**: Resend for OTP delivery

The server uses a clean separation:
- `routes.ts`: API endpoint registration with Zod validation
- `storage.ts`: Data access layer implementing `IStorage` interface
- `db.ts`: Database connection setup
- `email.ts`: Email templating and sending

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema-to-validation integration
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Generated via `drizzle-kit push`

Database tables:
- `users`: Authentication and profile data
- `otp_codes`: Temporary verification codes
- `tasks`: Task content, timing, and completion status
- `reflections`: Coaching question responses linked to tasks
- `task_reviews`: Post-completion satisfaction ratings

### Authentication Flow
1. User signs up with email/password
2. OTP code sent via Resend email service
3. User verifies OTP to activate account
4. Session-based authentication for subsequent requests
5. Forgot password flow uses same OTP mechanism

## External Dependencies

### Third-Party Services
- **Resend**: Email delivery for OTP codes (requires `RESEND_API_KEY` environment variable)

### Database
- **PostgreSQL**: Primary data store (requires `DATABASE_URL` environment variable)

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `RESEND_API_KEY`: Resend API key for email delivery
- `SESSION_SECRET`: Secret for session cookie signing (required in production)

### Key npm Packages
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `framer-motion`: Animation library for focus mode transitions
- `bcrypt`: Password hashing
- `express-session`: Session management
- `zod`: Runtime type validation (shared between client and server)
- `wouter`: Client-side routing
- `resend`: Email API client