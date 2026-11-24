-- 19xbet365 - PostgreSQL schema (v1)
-- Virtual-credit demonstration platform. No real-money columns or payment rails.
-- The schema is intentionally append-only for audit data and outcome records.

BEGIN;

CREATE TABLE IF NOT EXISTS roles (
  code          TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  rank          INTEGER NOT NULL UNIQUE,
  description   TEXT NOT NULL DEFAULT '',
  permissions   JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username          TEXT NOT NULL,
  email             TEXT NOT NULL,
  password_hash     TEXT NOT NULL,
  display_name      TEXT NOT NULL,
  role_code         TEXT NOT NULL REFERENCES roles(code),
  parent_id         UUID REFERENCES accounts(id) ON DELETE SET NULL,
  referred_by       UUID REFERENCES accounts(id) ON DELETE SET NULL,
  referral_code     TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','pending','closed')),
  balance           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  xp                INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
  level             INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  country           TEXT NOT NULL DEFAULT 'Global',
  phone             TEXT,
  avatar_seed       TEXT NOT NULL DEFAULT '19x',
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  marketing_opt_in  BOOLEAN NOT NULL DEFAULT false,
  suspended_reason  TEXT,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS accounts_email_lower_idx ON accounts (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS accounts_username_lower_idx ON accounts (lower(username));
CREATE INDEX IF NOT EXISTS accounts_parent_idx ON accounts (parent_id);
CREATE INDEX IF NOT EXISTS accounts_role_idx ON accounts (role_code);
CREATE INDEX IF NOT EXISTS accounts_status_idx ON accounts (status);
ALTER TABLE accounts ALTER COLUMN avatar_seed SET DEFAULT '19x';

CREATE TABLE IF NOT EXISTS sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  token_hash    TEXT NOT NULL UNIQUE,
  ip            TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,
  revoked_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sessions_account_idx ON sessions (account_id);

CREATE TABLE IF NOT EXISTS login_history (
  id          BIGSERIAL PRIMARY KEY,
  account_id  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  email       TEXT,
  ip          TEXT,
  user_agent  TEXT,
  success     BOOLEAN NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_history_account_idx ON login_history (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS referrals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  referee_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  code        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'rewarded' CHECK (status IN ('pending','rewarded','void')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referee_id)
);

CREATE TABLE IF NOT EXISTS account_transfers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_parent_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  to_parent_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  requested_by  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  review_note   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at   TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS transfers_status_idx ON account_transfers (status, created_at DESC);

CREATE TABLE IF NOT EXISTS account_invitations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role_code   TEXT NOT NULL REFERENCES roles(code),
  parent_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  invited_by  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  temp_password TEXT,
  token_hash  TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON account_invitations (status, created_at DESC);

CREATE TABLE IF NOT EXISTS games (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  category          TEXT NOT NULL,
  provider          TEXT NOT NULL,
  playable          BOOLEAN NOT NULL DEFAULT false,
  integration_status TEXT NOT NULL DEFAULT 'provider_required',
  rtp               NUMERIC(5,2),
  volatility        TEXT NOT NULL DEFAULT 'Medium',
  tagline           TEXT,
  description       TEXT,
  theme             JSONB NOT NULL DEFAULT '{}'::jsonb,
  features          JSONB NOT NULL DEFAULT '[]'::jsonb,
  how_to            JSONB NOT NULL DEFAULT '[]'::jsonb,
  badge             TEXT,
  featured          BOOLEAN NOT NULL DEFAULT false,
  players           INTEGER NOT NULL DEFAULT 0,
  max_win           TEXT,
  sort_order        INTEGER NOT NULL DEFAULT 100,
  status            TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','hidden','maintenance')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS games_category_idx ON games (category, sort_order);

CREATE TABLE IF NOT EXISTS sports (
  slug        TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT NOT NULL,
  event_count INTEGER NOT NULL DEFAULT 0,
  active      BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS matches (
  id          TEXT PRIMARY KEY,
  sport       TEXT NOT NULL,
  league      TEXT NOT NULL,
  home_team   TEXT NOT NULL,
  away_team   TEXT NOT NULL,
  start_time  TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished','suspended')),
  minute      TEXT,
  score_home  TEXT,
  score_away  TEXT,
  odds_home   NUMERIC(8,3),
  odds_draw   NUMERIC(8,3),
  odds_away   NUMERIC(8,3),
  featured    BOOLEAN NOT NULL DEFAULT false,
  is_demo     BOOLEAN NOT NULL DEFAULT true,
  result_home INTEGER,
  result_away INTEGER,
  settled_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_home INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result_away INTEGER;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS matches_settlement_idx ON matches (status, start_time) WHERE is_demo;
CREATE INDEX IF NOT EXISTS matches_sport_idx ON matches (sport, start_time);
CREATE INDEX IF NOT EXISTS matches_status_idx ON matches (status);

CREATE TABLE IF NOT EXISTS bets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('single','acca')),
  stake           NUMERIC(14,2) NOT NULL CHECK (stake > 0),
  total_odds      NUMERIC(12,3) NOT NULL CHECK (total_odds > 0),
  potential_return NUMERIC(14,2) NOT NULL,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','won','lost','void','cashed_out')),
  payout          NUMERIC(14,2) NOT NULL DEFAULT 0,
  placed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS bets_account_idx ON bets (account_id, placed_at DESC);

CREATE TABLE IF NOT EXISTS bet_selections (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bet_id          UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
  match_id        TEXT NOT NULL REFERENCES matches(id),
  selection       TEXT NOT NULL CHECK (selection IN ('home','draw','away')),
  selection_label TEXT NOT NULL,
  odds            NUMERIC(8,3) NOT NULL,
  result          TEXT NOT NULL DEFAULT 'pending' CHECK (result IN ('pending','won','lost','void'))
);
CREATE INDEX IF NOT EXISTS bet_selections_bet_idx ON bet_selections (bet_id);

CREATE TABLE IF NOT EXISTS game_rounds (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  game_id         TEXT NOT NULL REFERENCES games(id),
  bet             NUMERIC(14,2) NOT NULL CHECK (bet > 0),
  payout          NUMERIC(14,2) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','settled','void')),
  outcome         JSONB NOT NULL DEFAULT '{}'::jsonb,
  state           JSONB NOT NULL DEFAULT '{}'::jsonb,
  server_seed_hash TEXT,
  client_seed     TEXT,
  nonce           INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS rounds_account_idx ON game_rounds (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rounds_game_idx ON game_rounds (game_id, created_at DESC);
CREATE INDEX IF NOT EXISTS rounds_open_idx ON game_rounds (account_id, status) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('welcome_bonus','game_stake','game_win','bet_stake','bet_win','bet_refund','admin_credit','admin_debit','referral_reward','promo_credit','bonus_expiry')),
  amount        NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL CHECK (balance_after >= 0),
  description   TEXT NOT NULL,
  reference_type TEXT,
  reference_id  TEXT,
  created_by    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS transactions_account_idx ON transactions (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS favorites (
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  game_id     TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, game_id)
);

CREATE TABLE IF NOT EXISTS recent_plays (
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  game_id       TEXT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (account_id, game_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id  UUID REFERENCES accounts(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info','promo','security','game','system')),
  link        TEXT,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_account_idx ON notifications (account_id, created_at DESC);

CREATE TABLE IF NOT EXISTS promotions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  kicker      TEXT NOT NULL,
  description TEXT NOT NULL,
  type        TEXT NOT NULL,
  badge       TEXT,
  theme       TEXT NOT NULL DEFAULT 'lime',
  ends_at     TIMESTAMPTZ,
  cta         TEXT NOT NULL,
  terms       TEXT NOT NULL,
  prize       TEXT,
  active      BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 100,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournaments (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  game_id     TEXT REFERENCES games(id) ON DELETE SET NULL,
  prize_pool  NUMERIC(14,2) NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL,
  ends_at     TIMESTAMPTZ NOT NULL,
  status      TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming','live','finished')),
  participants INTEGER NOT NULL DEFAULT 0,
  leaderboard JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subject       TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'general',
  priority      TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  assigned_to   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tickets_status_idx ON support_tickets (status, created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id   UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES accounts(id) ON DELETE SET NULL,
  body        TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ticket_messages_idx ON support_messages (ticket_id, created_at);

CREATE TABLE IF NOT EXISTS audit_events (
  id          BIGSERIAL PRIMARY KEY,
  actor_id    UUID REFERENCES accounts(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  summary     TEXT NOT NULL,
  before      JSONB,
  after       JSONB,
  ip          TEXT,
  prev_hash   TEXT,
  event_hash  TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_created_idx ON audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS audit_actor_idx ON audit_events (actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  updated_by  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS content_pages (
  slug        TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','draft','archived')),
  updated_by  UUID REFERENCES accounts(id) ON DELETE SET NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS responsible_limits (
  account_id            UUID PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
  daily_bet_limit       NUMERIC(14,2),
  session_limit_minutes INTEGER,
  reality_check_minutes INTEGER NOT NULL DEFAULT 60,
  cool_off_until        TIMESTAMPTZ,
  self_exclusion_until  TIMESTAMPTZ,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Security: audit records are append-only. The service also computes a hash chain.
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS audit_no_update ON audit_events;
CREATE TRIGGER audit_no_update BEFORE UPDATE OR DELETE ON audit_events
FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- Completed game rounds cannot be altered by the application.
CREATE OR REPLACE FUNCTION protect_settled_rounds() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'settled' AND (NEW.payout <> OLD.payout OR NEW.outcome <> OLD.outcome OR NEW.status <> OLD.status) THEN
    RAISE EXCEPTION 'settled rounds are immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settled_rounds_immutable ON game_rounds;
CREATE TRIGGER settled_rounds_immutable BEFORE UPDATE ON game_rounds
FOR EACH ROW EXECUTE FUNCTION protect_settled_rounds();

COMMIT;
