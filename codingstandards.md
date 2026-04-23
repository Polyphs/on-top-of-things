# Coding Standards for OT² Development

## Version Control & Backup System

### File Naming Convention

All source files follow this versioning pattern:

```
<name>-<Year>-w<Week#>-d<Day>-b<Build#>.jsx
```

Where:
- **Year**: 4-digit year (e.g., `2026`)
- **Week#**: ISO week number (01-53), prefixed with `w` (e.g., `w16`)
- **Day**: Day of week (01=Monday, 07=Sunday), prefixed with `d` (e.g., `d05` for Friday)
- **Build#**: Incremental build number within the same day, prefixed with `b` (e.g., `b1`, `b2`, `b3`)

### Examples

- `OT2_v3_Pool_Pod_Blink-2026-w16-d05-b2.jsx` - Year 2026, Week 16, Friday (day 5), Build 2
- `OT2_v3_Pool_Pod_Blink-2026-w16-d06-b1.jsx` - Year 2026, Week 16, Saturday (day 6), Build 1

### Workflow for Making Changes

1. **Before modifying the source file**, add a `CURRENT CHANGE` comment at the top of the file describing what you're about to change:

```javascript
// ============================================================================
// CURRENT CHANGE: <Brief description of the change being made>
// CHANGE DATE: <Current date>
// CHANGE REASON: <Why this change is needed>
// EXPECTED IMPACT: <What functionality will be affected>
// ============================================================================
```

2. **Create a versioned backup** of the current working file using the naming convention above.

3. **Work on the source copy** (`OT2_v3_Pool_Pod_Blink.jsx`) — this is always the working file.

4. **Increment build numbers** when making multiple changes on the same day:
   - First change of the day: `b1`
   - Second change: `b2`
   - And so on...

5. **Run regression tests** after making changes to ensure nothing is broken.

6. **Add new regression tests** for any new functionality.

### Quick Reference: ISO Week Days

| Day | Code | Day Name |
|-----|------|----------|
| 1 | d01 | Monday |
| 2 | d02 | Tuesday |
| 3 | d03 | Wednesday |
| 4 | d04 | Thursday |
| 5 | d05 | Friday |
| 6 | d06 | Saturday |
| 7 | d07 | Sunday |

### Getting Current ISO Week

Use this command to get current ISO week:
```bash
# Linux/Mac
date +%G-W%V-%u

# PowerShell
Get-Date -UFormat '%Y-W%V-%u'
```

### Reverting Changes

To revert to a previous version:
1. Identify the version you want to revert to from the backup filename
2. Copy the backup file over the current working file
3. Update the `CURRENT CHANGE` comment to document the revert

---

## Code Style Guidelines

### JavaScript/React Standards

1. Use 2-space indentation
2. Use single quotes for strings
3. Use camelCase for variables and functions
4. Use PascalCase for components
5. Always use strict equality (`===` and `!==`)
6. Keep functions focused and small
7. Add comments for complex logic

### Component Structure

```javascript
// ============================================================================
// Component Name - Brief description
// ============================================================================

// Imports at top
import React from 'react';

// Constants
const CONSTANTS = {
  // ...
};

// Helper functions
const helperFunction = () => {
  // ...
};

// Main component
export default function ComponentName() {
  // ...
}
```

---

## Testing Standards

### Regression Tests

All regression tests live in `src/relationship-regression-tests.jsx`.

When adding new functionality:
1. Add corresponding regression tests
2. Run all tests before committing changes
3. Tests should be independent and idempotent

### Running Tests

```javascript
import { runRelationshipTests } from './relationship-regression-tests.jsx';

// In console or component
runRelationshipTests();
```

---

## Documentation Update Standards

### Session-Based Documentation Sync

All project documentation must be updated in the same session as code changes:

1. **Files to Update:**
   - `src/feature-update-tracker.md` — add FEAT-XXX entries
   - `src/essenceofbusiness.md` — add strategic decisions
   - `src/error-log.md` — add ERR-XXX entries
   - `src/OT2_CHANGELOG.md` — add to completed/pending tables
   - `FEATURE_PARITY.md` — add parity rows
   - `runninglog.txt` — append one-liner summary

2. **Date Format in Docs:**
   - Use `YYYY-W<week>-d<day>` (e.g., `2026-W17-d03`)
   - Get current: `Get-Date -UFormat '%Y-W%V-%u'` (PowerShell)

3. **CURRENT CHANGE Comment:**
   - In `.jsx` files, add `// CURRENT CHANGE: FEAT-XXX` before modifications
   - Include: description, date, reason, expected impact

4. **Backup Requirements:**
   - Create versioned backup BEFORE every code change
   - Pattern: `<name>-YYYY-w<week>-d<day>-b<build>.jsx`
   - Docs-only sessions don't need `.jsx` backups

### Documentation Quality

- One feature/fix per entry
- Include: requested date, location, description, files changed
- Mark status: `[PLANNED]` · `[IN PROGRESS]` · `[DEV COMPLETE]` · `[VERIFIED]`
- Link related docs (feature-update-tracker ↔ error-log ↔ OT2_CHANGELOG)

---

*Last updated: 2026-W17*
