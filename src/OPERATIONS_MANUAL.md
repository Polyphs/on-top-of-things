# OT² Operations Manual — Git Workflow & Deployment

**Philosophy:** Consistent, predictable Git operations combined with file-based versioned backups enable reliable development and deployment. Every commit, branch, merge, and backup follows established patterns to prevent errors and maintain clean history.

---

## 1. Git Philosophy

OT² uses a **feature-branch workflow** with clear separation between development and production states. Every change is tested on `dev` before reaching `main`. Git branches provide the collaboration layer, while the file-based versioning system (see `codingstandards.md`) provides granular, per-change backups.

**Core Principles:**
- **Never commit directly to main** — All changes flow through `dev`
- **Create versioned file backups** before every code change (per `codingstandards.md`)
- **Create backup branches** before major merges
- **Clean working trees** before switching branches
- **Run regression tests** after every change (`src/relationship-regression-tests.jsx`)

---

## 2. Branch Strategy

| Branch | Purpose | Protection | Merge Direction |
|--------|---------|------------|-----------------|
| **main** | Production-ready code | Protected | ← dev |
| **dev** | Development integration | Protected | ← feature branches |
| **last-good-build** | Backup reference point | Read-only | None |
| **last-good-build-YYYY_WXX** | Timestamped backups | Read-only | None |

**Branch Naming Convention:**
- Feature branches: `feature/description` or `description`
- Backup branches: `last-good-build-YYYY_WXX` (e.g., `last-good-build-2026_W17`)
- Hotfix branches: `hotfix/description`

---

## 3. Development Workflow

### 3.1 Pre-Change: File Backup (per codingstandards.md)

Before modifying any `.jsx` source file, follow the file-based backup system:

```bash
# 1. Add CURRENT CHANGE comment at top of the working file
#    Format:
#    // ============================================================================
#    // CURRENT CHANGE: FEAT-XXX — <Brief description>
#    // CHANGE DATE: <YYYY-Www-dd>
#    // CHANGE REASON: <Why this change is needed>
#    // EXPECTED IMPACT: <What functionality will be affected>
#    // ============================================================================

# 2. Create a versioned backup copy
#    Pattern: <name>-YYYY-w<week>-d<day>-b<build>.jsx
#    Example: OT2_v3_Pool_Pod_Blink-2026-w17-d03-b7.jsx

# 3. Work on the source copy (OT2_v3_Pool_Pod_Blink.jsx)
```

**Build Number Rules:**
- First change of the day: `b1`
- Second change: `b2`, and so on
- Reset to `b1` on a new day

### 3.2 Feature Development
```bash
# Start on latest dev
git checkout dev
git pull origin dev

# Create feature branch
git checkout -b feature/pool-pod-enhancement

# Create versioned file backup (see 3.1)
# Work on changes...
# Commit regularly with semantic messages
git add .
git commit -m "feat(pool): add blink interval configuration"

# Push feature branch for review
git push -u origin feature/pool-pod-enhancement
```

### 3.3 Integration to Dev
```bash
# Switch to dev
git checkout dev
git pull origin dev

# Merge feature branch
git merge feature/pool-pod-enhancement

# Run regression tests
# In browser console or component:
# import { runRelationshipTests } from './relationship-regression-tests.jsx';
# runRelationshipTests();

# Push to dev
git push origin dev

# Delete feature branch (optional)
git branch -d feature/pool-pod-enhancement
git push origin --delete feature/pool-pod-enhancement
```

### 3.4 Creating Last Good Build
```bash
# Ensure dev is clean and up-to-date
git checkout dev
git status  # Should show: "nothing to commit, working tree clean"
git pull origin dev

# Create backup branch
git checkout -b last-good-build
git push -u origin last-good-build

# Return to dev for continued work
git checkout dev
```

---

## 4. Release Workflow

### 4.1 Pre-Release Checklist
- [ ] All regression tests passing (`src/relationship-regression-tests.jsx`)
- [ ] Working tree clean (`git status` shows no uncommitted changes)
- [ ] `dev` branch is up-to-date (`git pull origin dev`)
- [ ] Documentation synced (see §6 Documentation Sync)
- [ ] Versioned file backup created for current state
- [ ] Create `last-good-build` backup branch

### 4.2 Release Process
```bash
# 1. Create file backup of current working state
#    Copy OT2_v3_Pool_Pod_Blink.jsx → OT2_v3_Pool_Pod_Blink-YYYY-wWW-dD-bN.jsx

# 2. Create backup branch
git checkout dev
git checkout -b last-good-build
git push -u origin last-good-build

# 3. Switch to main
git checkout main
git pull origin main

# 4. Merge dev into main
git merge dev --no-edit  # Or use custom message
git push origin main

# 5. Tag the release with date-based version
git tag -a "v2026-W17-d03" -m "Release: 2026 Week 17 Day 3"
git push origin main --tags

# 6. Update dev with release tag reference
git checkout dev
git merge main
git push origin dev
```

### 4.3 Post-Release
- [ ] Verify Netlify deployment
- [ ] Update `src/OT2_CHANGELOG.md` with release entry
- [ ] Append summary to `runninglog.txt`
- [ ] Close related issues/feature entries in `src/feature-update-tracker.md`

---

## 5. Commit Message Standards

**Format:** `type(scope): description`

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code formatting (no functional changes)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process, dependency updates, etc.

**Examples:**
```
feat(pool): add multi-pod blink synchronization
fix(auth): resolve Supabase session expiry handling
docs(manual): update release workflow steps
test(regression): add pool allocation boundary tests
chore(deps): bump vite to v6.x
```

---

## 6. Documentation Sync

Per `codingstandards.md`, all project documentation must be updated in the same session as code changes:

**Files to Update:**
| File | Purpose | Entry Format |
|------|---------|-------------|
| `src/feature-update-tracker.md` | Feature/bug tracking | FEAT-XXX entries |
| `src/essenceofbusiness.md` | Strategic decisions | Decision entries |
| `src/error-log.md` | Error tracking | ERR-XXX entries |
| `src/OT2_CHANGELOG.md` | Version changelog | Completed/pending tables |
| `FEATURE_PARITY.md` | Feature parity tracking | Parity rows |
| `runninglog.txt` | Session summary | One-liner per session |

**Date Format in Docs:** `YYYY-W<week>-d<day>` (e.g., `2026-W17-d03`)

**Status Markers:** `[PLANNED]` · `[IN PROGRESS]` · `[DEV COMPLETE]` · `[VERIFIED]`

---

## 7. Repository Structure

```
ot3-rev1/
├── src/
│   ├── OT2_v3_Pool_Pod_Blink.jsx      # Main working file
│   ├── OT2_StressTest.jsx             # Stress test component
│   ├── App.jsx                        # Application root
│   ├── main.jsx                       # Entry point
│   ├── relationship-regression-tests.jsx  # Regression test suite
│   ├── feature-update-tracker.md      # Feature/bug tracking
│   ├── OT2_CHANGELOG.md               # Version changelog
│   ├── error-log.md                   # Error tracking
│   ├── essenceofbusiness.md           # Strategic decisions
│   ├── OPERATIONS_MANUAL.md           # This document
│   ├── blogService.js                 # Blog data service
│   ├── supabase.js                    # Supabase client
│   └── useAuth.js                     # Auth hook
├── dist/                              # Build output
├── scripts/                           # Build/deployment scripts
├── codingstandards.md                 # Coding standards
├── designstandards.md                 # Design guidelines
├── FEATURE_PARITY.md                  # Feature parity tracking
├── runninglog.txt                     # Session log
├── netlify.toml                       # Netlify config
├── vite.config.js                     # Vite config
├── package.json                       # Dependencies
└── .gitignore                         # Git ignore rules
```

**Important Paths:**
- Application root: `ot3-rev1/`
- Source directory: `ot3-rev1/src/`
- Main working file: `src/OT2_v3_Pool_Pod_Blink.jsx`
- Always run git commands from `ot3-rev1/`

---

## 8. File Management

### 8.1 .gitignore Rules
```gitignore
# Environment files with secrets
.env
.env.local

# Dependencies
node_modules/

# Build outputs
dist/

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db
```

### 8.2 Handling Untracked Files
```bash
# Check status
git status

# Add files that should be tracked
git add path/to/file.jsx

# Ignore files that shouldn't be tracked
# Add pattern to .gitignore

# Remove accidentally committed files
git rm --cached file-to-remove
```

### 8.3 Versioned Backup Files

Versioned `.jsx` backup files (e.g., `OT2_v3_Pool_Pod_Blink-2026-w17-d03-b5.jsx`) are committed to Git as part of the project history. They serve as granular restore points independent of branch state.

---

## 9. Troubleshooting

### 9.1 Common Issues

**Issue:** Merge conflict
```bash
# Resolve conflicts manually in the affected .jsx files
# Then:
git add .
git commit -m "resolve: merge conflicts in pool pod component"
```

**Issue:** Wrong branch checked out
```bash
# Stash changes
git stash

# Switch branches
git checkout correct-branch

# Apply stashed changes
git stash pop
```

**Issue:** Detached HEAD
```bash
# Find your branch
git branch

# Return to branch
git checkout dev

# Or create new branch from current state
git checkout -b new-branch-name
```

**Issue:** Push rejected
```bash
# Pull latest changes first
git pull origin dev

# Resolve any conflicts
# Then push
git push origin dev
```

### 9.2 Recovery Procedures

**Recover from bad commit:**
```bash
# Find good commit hash
git log --oneline

# Reset to good commit
git reset --hard <commit-hash>

# Force push (use with caution!)
git push --force-with-lease origin dev
```

**Restore from versioned file backup:**
```bash
# Identify the backup version to restore from filename
# Example: OT2_v3_Pool_Pod_Blink-2026-w16-d06-b5.jsx

# Copy backup over working file
cp src/OT2_v3_Pool_Pod_Blink-2026-w16-d06-b5.jsx src/OT2_v3_Pool_Pod_Blink.jsx

# Update CURRENT CHANGE comment to document the revert
# Commit the restored version
git add src/OT2_v3_Pool_Pod_Blink.jsx
git commit -m "revert: restore from backup 2026-w16-d06-b5"
```

**Restore deleted branch:**
```bash
# Find deleted branch hash
git reflog

# Recreate branch
git checkout -b restored-branch <hash>
```

---

## 10. Best Practices

### 10.1 Daily Workflow
1. Start each day with `git pull origin dev`
2. Check `runninglog.txt` for last session context
3. Create feature branches for new work
4. Create versioned file backup before every code change
5. Commit frequently with clear messages
6. Run regression tests after each change
7. Push work daily for backup
8. End day with clean working tree and updated docs

### 10.2 Before Major Operations
- Always check `git status`
- Ensure working tree is clean
- Create versioned file backup of current state
- Create backup branches
- Verify remote repository status

### 10.3 Code Review Guidelines
- Review commit messages for clarity
- Ensure no sensitive data is committed (check `.env` files are gitignored)
- Verify all regression tests pass
- Check that CURRENT CHANGE comments are present and accurate
- Confirm documentation files are synced

---

## 11. Emergency Procedures

### 11.1 Quick Rollback via Git
```bash
# Identify last good version
git log --oneline main

# Rollback main
git checkout main
git reset --hard <good-commit-hash>
git push --force-with-lease origin main
```

### 11.2 Restore from Backup Branch
```bash
# List backup branches
git branch -a | grep last-good-build

# Restore from latest backup
git checkout main
git reset --hard last-good-build
git push --force-with-lease origin main
```

### 11.3 Restore from Versioned File Backup
```bash
# List available backups
ls src/OT2_v3_Pool_Pod_Blink-*.jsx

# Restore specific version
cp src/OT2_v3_Pool_Pod_Blink-<version>.jsx src/OT2_v3_Pool_Pod_Blink.jsx
git add src/OT2_v3_Pool_Pod_Blink.jsx
git commit -m "emergency: restore from file backup <version>"
git push origin dev
```

---

## 12. Tools and Commands Reference

### 12.1 Essential Git Commands
```bash
git status                    # Show working tree status
git log --oneline -5         # Show recent commits
git branch -a                # List all branches
git add .                    # Stage all changes
git commit -m "message"      # Commit changes
git push origin branch       # Push to remote
git pull origin branch       # Pull from remote
git checkout branch          # Switch branches
git merge branch             # Merge branch
git tag -a "v1.0" -m "msg"  # Create annotated tag
```

### 12.2 Project-Specific Commands
```bash
# Get current ISO week/date (PowerShell)
Get-Date -UFormat '%Y-W%V-%u'

# Run dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 12.3 Useful Git Aliases (Optional)
```bash
# Add to ~/.gitconfig
[alias]
  st = status
  co = checkout
  br = branch
  ci = commit
  lg = log --oneline --graph --decorate
```

---

## 13. Deployment Integration

### 13.1 Netlify Deployment

OT² is deployed via Netlify. Configuration is in `netlify.toml` at the project root.

```bash
# Build command (defined in netlify.toml)
npm run build

# Publish directory
dist/
```

### 13.2 Version Tags
- Tags use date-based format: `vYYYY-Www-dD` (e.g., `v2026-W17-d03`)
- Tags are created manually with `git tag -a`
- Always push tags with `git push --tags`

### 13.3 Environment Variables
Sensitive configuration lives in `.env` files (gitignored). Reference `.env.example` for required variables.

```bash
# Check for sensitive data before committing
git grep --ignore-case --line-number "password\|secret\|key\|token"

# Supabase keys and other secrets must stay in .env only
```

---

*Last updated: 2026-W17-d03*  
*Based on OT² development practices and codingstandards.md*
