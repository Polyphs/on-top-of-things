-- ============================================================================
-- OT² v3 Migration — Pool · Pod · Blink additions
-- Run AFTER the initial 001_initial_schema.sql migration
-- ============================================================================

-- ─── POOLS ────────────────────────────────────────────────────────────────────
-- A Pool groups tasks by relationship type (precedes, follows, schedule, accomplishes)

CREATE TABLE IF NOT EXISTS pools (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#6366F1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pool members: tasks that belong to a pool with a relationship type
CREATE TABLE IF NOT EXISTS pool_members (
  pool_id         UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  relationship    TEXT NOT NULL CHECK (relationship IN ('precede','follow','schedule','accomplish')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pool_id, task_id)
);

-- ─── PODS ─────────────────────────────────────────────────────────────────────
-- A Pod groups recurring or annual-date tasks with shared schedule config

CREATE TABLE IF NOT EXISTS pods (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  pod_type        TEXT        NOT NULL CHECK (pod_type IN ('annual_dates', 'recurring')),
  recurrence      JSONB,      -- for recurring pods: { type, weekDays, everyNDays, frequency }
  tracker_fields  JSONB,      -- [{ name, type }] for recurring pods
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pod tasks: tasks that belong to a pod
CREATE TABLE IF NOT EXISTS pod_members (
  pod_id          UUID NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  annual_date     TEXT,       -- MM-DD for annual_dates pods
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (pod_id, task_id)
);

-- Pod logs: daily completion log for recurring pods
CREATE TABLE IF NOT EXISTS pod_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  pod_id          UUID        NOT NULL REFERENCES pods(id) ON DELETE CASCADE,
  task_id         UUID        NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date        DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'incomplete' CHECK (status IN ('incomplete', 'done', 'skipped')),
  tracker_values  JSONB,      -- { field_name: value }
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pod_id, task_id, log_date)
);

-- ─── BLINK TASKS (flag on tasks table) ───────────────────────────────────────
-- Blink = quick one-off task. Add a column to existing tasks table.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_blink BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

ALTER TABLE pools       ENABLE ROW LEVEL SECURITY;
ALTER TABLE pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pods        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_logs     ENABLE ROW LEVEL SECURITY;

-- Pools: user owns their pools
CREATE POLICY "pools_owner" ON pools
  FOR ALL USING (auth.uid() = user_id);

-- Pool members: user owns pool → can manage members
CREATE POLICY "pool_members_owner" ON pool_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pools WHERE pools.id = pool_id AND pools.user_id = auth.uid())
  );

-- Pods: user owns their pods
CREATE POLICY "pods_owner" ON pods
  FOR ALL USING (auth.uid() = user_id);

-- Pod members: user owns pod → can manage members
CREATE POLICY "pod_members_owner" ON pod_members
  FOR ALL USING (
    EXISTS (SELECT 1 FROM pods WHERE pods.id = pod_id AND pods.user_id = auth.uid())
  );

-- Pod logs: user owns their logs
CREATE POLICY "pod_logs_owner" ON pod_logs
  FOR ALL USING (auth.uid() = user_id);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_pools_user_id         ON pools(user_id);
CREATE INDEX IF NOT EXISTS idx_pods_user_id          ON pods(user_id);
CREATE INDEX IF NOT EXISTS idx_pod_logs_pod_task_date ON pod_logs(pod_id, task_id, log_date);
CREATE INDEX IF NOT EXISTS idx_tasks_is_blink        ON tasks(user_id, is_blink) WHERE is_blink = TRUE;
