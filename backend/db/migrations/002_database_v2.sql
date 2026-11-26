-- 19xbet365 — Database v2: production hardening and domain structure
-- Idempotent migration. Safe to run after the v1 schema on an existing database.
-- This migration does not delete or rewrite existing financial or audit data.

-- ---------------------------------------------------------------------------
-- 1. General integrity helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE matches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE deposit_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE content_pages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'roles', 'accounts', 'games', 'matches', 'promotions', 'tournaments',
    'support_tickets', 'content_pages', 'fantasy_contests', 'account_verifications',
    'deposit_requests', 'withdrawal_requests', 'responsible_limits', 'platform_settings'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_touch_updated_at ON %I', table_name, table_name);
    EXECUTE format(
      'CREATE TRIGGER %I_touch_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      table_name, table_name
    );
  END LOOP;
END;
$$;

-- Reject a parent chain that would form a cycle in the account hierarchy.
CREATE OR REPLACE FUNCTION prevent_account_hierarchy_cycle() RETURNS trigger AS $$
DECLARE
  creates_cycle boolean;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.parent_id = NEW.id THEN
    RAISE EXCEPTION 'an account cannot be its own parent' USING ERRCODE = 'check_violation';
  END IF;

  WITH RECURSIVE ancestors AS (
    SELECT id, parent_id FROM accounts WHERE id = NEW.parent_id
    UNION ALL
    SELECT a.id, a.parent_id
    FROM accounts a
    JOIN ancestors x ON a.id = x.parent_id
  )
  SELECT EXISTS (SELECT 1 FROM ancestors WHERE id = NEW.id) INTO creates_cycle;

  IF creates_cycle THEN
    RAISE EXCEPTION 'account hierarchy cycle detected for %', NEW.id USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS accounts_prevent_hierarchy_cycle ON accounts;
CREATE TRIGGER accounts_prevent_hierarchy_cycle
BEFORE INSERT OR UPDATE OF parent_id ON accounts
FOR EACH ROW EXECUTE FUNCTION prevent_account_hierarchy_cycle();

-- Basic identity hygiene at the storage layer.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_email_format_check;
ALTER TABLE accounts ADD CONSTRAINT accounts_email_format_check
  CHECK (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

-- ---------------------------------------------------------------------------
-- 2. Wallet ledger hardening
-- ---------------------------------------------------------------------------

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check
  CHECK (type IN (
    'opening_balance','welcome_bonus','game_stake','game_win','bet_stake','bet_win','bet_refund',
    'admin_credit','admin_debit','referral_reward','promo_credit','bonus_expiry','deposit','deposit_bonus',
    'fantasy_entry','fantasy_win','fantasy_refund','withdrawal_request','withdrawal_paid','withdrawal_refund'
  ));

ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_amount_nonzero_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_amount_nonzero_check CHECK (amount <> 0);

-- One wallet movement per account, business reference and movement type. This
-- is the database-level idempotency guard for deposits, rounds, bets and
-- fantasy prizes, while still allowing multiple winners in one contest.
DROP INDEX IF EXISTS transactions_reference_unique_idx;
CREATE UNIQUE INDEX transactions_reference_unique_idx
  ON transactions (account_id, reference_type, reference_id, type)
  WHERE reference_type IS NOT NULL AND reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS transactions_account_type_idx
  ON transactions (account_id, type, created_at DESC);

CREATE OR REPLACE FUNCTION prevent_transaction_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'wallet transactions are append-only' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS transactions_append_only ON transactions;
CREATE TRIGGER transactions_append_only
BEFORE UPDATE OR DELETE ON transactions
FOR EACH ROW EXECUTE FUNCTION prevent_transaction_mutation();

CREATE OR REPLACE VIEW wallet_reconciliation AS
SELECT
  a.id AS account_id,
  a.email,
  a.balance,
  COALESCE(SUM(t.amount), 0)::NUMERIC(14,2) AS ledger_sum,
  (a.balance - COALESCE(SUM(t.amount), 0))::NUMERIC(14,2) AS difference,
  CASE
    WHEN abs(a.balance - COALESCE(SUM(t.amount), 0)) < 0.005 THEN 'balanced'
    ELSE 'mismatch'
  END AS status
FROM accounts a
LEFT JOIN transactions t ON t.account_id = a.id
GROUP BY a.id, a.email, a.balance;

COMMENT ON VIEW wallet_reconciliation IS
  'Reconciles each account balance against the append-only wallet ledger. Mismatches require investigation.';

-- ---------------------------------------------------------------------------
-- 3. Immutable settled sports bets
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS bets_status_idx ON bets (status, placed_at DESC);
CREATE INDEX IF NOT EXISTS bet_selections_match_idx ON bet_selections (match_id, result);
CREATE UNIQUE INDEX IF NOT EXISTS bet_selections_unique_idx
  ON bet_selections (bet_id, match_id, selection);

CREATE OR REPLACE FUNCTION protect_settled_bets() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'settled bets are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settled_bets_immutable ON bets;
CREATE TRIGGER settled_bets_immutable
BEFORE UPDATE ON bets
FOR EACH ROW EXECUTE FUNCTION protect_settled_bets();

CREATE OR REPLACE FUNCTION protect_bet_selection_result() RETURNS trigger AS $$
BEGIN
  IF OLD.result <> 'pending' AND NEW.result <> OLD.result THEN
    RAISE EXCEPTION 'settled selection results are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settled_selection_immutable ON bet_selections;
CREATE TRIGGER settled_selection_immutable
BEFORE UPDATE ON bet_selections
FOR EACH ROW EXECUTE FUNCTION protect_bet_selection_result();

-- ---------------------------------------------------------------------------
-- 4. Game rounds: no mutation after settlement or voiding
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION protect_settled_rounds() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'open' THEN
    RAISE EXCEPTION 'settled or void game rounds are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists; function replacement takes effect immediately.
CREATE INDEX IF NOT EXISTS rounds_settled_idx ON game_rounds (settled_at DESC) WHERE settled_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 5. Deposit and withdrawal review integrity
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS deposit_requests_account_reference_idx
  ON deposit_requests (account_id, upper(btrim(reference)));
CREATE INDEX IF NOT EXISTS deposit_requests_reviewed_idx
  ON deposit_requests (reviewed_at DESC) WHERE reviewed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION protect_deposit_financial_fields() RETURNS trigger AS $$
BEGIN
  IF NEW.account_id <> OLD.account_id
     OR NEW.amount <> OLD.amount
     OR NEW.method <> OLD.method
     OR upper(btrim(NEW.reference)) <> upper(btrim(OLD.reference)) THEN
    RAISE EXCEPTION 'deposit account, amount, method and reference are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status <> 'pending' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'a reviewed deposit cannot change status again' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deposit_financial_fields_immutable ON deposit_requests;
CREATE TRIGGER deposit_financial_fields_immutable
BEFORE UPDATE ON deposit_requests
FOR EACH ROW EXECUTE FUNCTION protect_deposit_financial_fields();

CREATE UNIQUE INDEX IF NOT EXISTS withdrawal_requests_one_open_idx
  ON withdrawal_requests (account_id) WHERE status IN ('pending','approved');
CREATE INDEX IF NOT EXISTS withdrawal_requests_reviewed_idx
  ON withdrawal_requests (reviewed_at DESC) WHERE reviewed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION protect_withdrawal_financial_fields() RETURNS trigger AS $$
BEGIN
  IF NEW.account_id <> OLD.account_id
     OR NEW.amount <> OLD.amount
     OR NEW.method <> OLD.method
     OR NEW.destination <> OLD.destination THEN
    RAISE EXCEPTION 'withdrawal account, amount, method and destination are immutable' USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.status IN ('paid','rejected','cancelled') THEN
    RAISE EXCEPTION 'a final withdrawal state is immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS withdrawal_financial_fields_immutable ON withdrawal_requests;
CREATE TRIGGER withdrawal_financial_fields_immutable
BEFORE UPDATE ON withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION protect_withdrawal_financial_fields();

-- ---------------------------------------------------------------------------
-- 6. Bonus grants
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS bonus_grants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  source_type       TEXT NOT NULL,
  source_id         TEXT NOT NULL,
  amount            NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  remaining         NUMERIC(14,2) NOT NULL CHECK (remaining >= 0),
  wagering_required NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (wagering_required >= 0),
  wagered           NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (wagered >= 0),
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','expired','forfeited')),
  expires_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (source_type, source_id, account_id)
);
CREATE INDEX IF NOT EXISTS bonus_grants_account_idx ON bonus_grants (account_id, status, created_at DESC);
DROP TRIGGER IF EXISTS bonus_grants_touch_updated_at ON bonus_grants;
CREATE TRIGGER bonus_grants_touch_updated_at BEFORE UPDATE ON bonus_grants
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. KYC document history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS kyc_documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id    UUID NOT NULL REFERENCES account_verifications(id) ON DELETE CASCADE,
  account_id         UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  document_type      TEXT NOT NULL CHECK (document_type IN ('passport','driving_licence','national_id')),
  document_reference TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','superseded')),
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  submitted_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at        TIMESTAMPTZ,
  reviewed_by        UUID REFERENCES accounts(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS kyc_documents_account_idx ON kyc_documents (account_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS kyc_documents_verification_idx ON kyc_documents (verification_id, submitted_at DESC);

-- ---------------------------------------------------------------------------
-- 8. Responsible-play change history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS responsible_limit_events (
  id          BIGSERIAL PRIMARY KEY,
  account_id  UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL CHECK (event_type IN ('created','updated')),
  previous    JSONB,
  next        JSONB NOT NULL,
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS responsible_limit_events_account_idx
  ON responsible_limit_events (account_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_responsible_limit_event() RETURNS trigger AS $$
BEGIN
  INSERT INTO responsible_limit_events (account_id, event_type, previous, next)
  VALUES (
    NEW.account_id,
    CASE WHEN TG_OP = 'INSERT' THEN 'created' ELSE 'updated' END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS responsible_limits_history ON responsible_limits;
CREATE TRIGGER responsible_limits_history
AFTER INSERT OR UPDATE ON responsible_limits
FOR EACH ROW EXECUTE FUNCTION log_responsible_limit_event();

-- ---------------------------------------------------------------------------
-- 9. Sports odds history
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS match_odds_history (
  id          BIGSERIAL PRIMARY KEY,
  match_id    TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  odds_home   NUMERIC(8,3),
  odds_draw   NUMERIC(8,3),
  odds_away   NUMERIC(8,3),
  changed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS match_odds_history_match_idx
  ON match_odds_history (match_id, changed_at DESC);

CREATE OR REPLACE FUNCTION log_match_odds_change() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.odds_home IS DISTINCT FROM OLD.odds_home
     OR NEW.odds_draw IS DISTINCT FROM OLD.odds_draw
     OR NEW.odds_away IS DISTINCT FROM OLD.odds_away THEN
    INSERT INTO match_odds_history (match_id, odds_home, odds_draw, odds_away)
    VALUES (NEW.id, NEW.odds_home, NEW.odds_draw, NEW.odds_away);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_odds_history_trigger ON matches;
CREATE TRIGGER match_odds_history_trigger
AFTER INSERT OR UPDATE OF odds_home, odds_draw, odds_away ON matches
FOR EACH ROW EXECUTE FUNCTION log_match_odds_change();

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_sport_fk;
ALTER TABLE matches ADD CONSTRAINT matches_sport_fk FOREIGN KEY (sport) REFERENCES sports(slug) NOT VALID;
ALTER TABLE matches VALIDATE CONSTRAINT matches_sport_fk;

CREATE INDEX IF NOT EXISTS matches_odds_history_idx ON matches (sport, status, start_time);

-- ---------------------------------------------------------------------------
-- 10. Fantasy integrity
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_fantasy_prize_overlap() RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM fantasy_prize_tiers t
    WHERE t.contest_id = NEW.contest_id
      AND t.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND int4range(t.rank_from, t.rank_to, '[]') && int4range(NEW.rank_from, NEW.rank_to, '[]')
  ) THEN
    RAISE EXCEPTION 'fantasy prize tiers cannot overlap' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fantasy_prize_tiers_no_overlap ON fantasy_prize_tiers;
CREATE TRIGGER fantasy_prize_tiers_no_overlap
BEFORE INSERT OR UPDATE ON fantasy_prize_tiers
FOR EACH ROW EXECUTE FUNCTION prevent_fantasy_prize_overlap();

CREATE OR REPLACE FUNCTION validate_fantasy_entry() RETURNS trigger AS $$
DECLARE
  contest fantasy_contests%ROWTYPE;
  match_row matches%ROWTYPE;
  ids text[];
  selected_count integer;
  invalid_count integer;
  salary_sum numeric;
  wk_count integer;
  bat_count integer;
  ar_count integer;
  bowl_count integer;
  max_team_count integer;
BEGIN
  SELECT * INTO contest FROM fantasy_contests WHERE id = NEW.contest_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'fantasy contest does not exist' USING ERRCODE = 'foreign_key_violation';
  END IF;
  IF jsonb_typeof(NEW.lineup) <> 'array' THEN
    RAISE EXCEPTION 'fantasy lineup must be an array' USING ERRCODE = 'check_violation';
  END IF;
  SELECT array_agg(value) INTO ids FROM jsonb_array_elements_text(NEW.lineup);
  IF ids IS NULL OR cardinality(ids) = 0 THEN
    RAISE EXCEPTION 'fantasy lineup cannot be empty' USING ERRCODE = 'check_violation';
  END IF;
  IF cardinality(ids) <> (SELECT count(DISTINCT x) FROM unnest(ids) x) THEN
    RAISE EXCEPTION 'fantasy lineup cannot contain the same player twice' USING ERRCODE = 'unique_violation';
  END IF;
  IF NOT (NEW.captain_id = ANY(ids)) OR NOT (NEW.vice_captain_id = ANY(ids)) OR NEW.captain_id = NEW.vice_captain_id THEN
    RAISE EXCEPTION 'captain and vice-captain must be distinct members of the lineup' USING ERRCODE = 'check_violation';
  END IF;

  SELECT * INTO match_row FROM matches WHERE id = contest.match_id;
  SELECT
    count(*),
    count(*) FILTER (WHERE role = 'wk'),
    count(*) FILTER (WHERE role = 'bat'),
    count(*) FILTER (WHERE role = 'ar'),
    count(*) FILTER (WHERE role = 'bowl'),
    COALESCE(sum(salary), 0)
  INTO selected_count, wk_count, bat_count, ar_count, bowl_count, salary_sum
  FROM fantasy_players
  WHERE id = ANY(ids) AND active = true;

  IF selected_count <> cardinality(ids) THEN
    RAISE EXCEPTION 'one or more fantasy players are unavailable' USING ERRCODE = 'check_violation';
  END IF;
  SELECT count(*) INTO invalid_count
  FROM fantasy_players
  WHERE id = ANY(ids)
    AND (sport <> contest.sport OR team NOT IN (match_row.home_team, match_row.away_team));
  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'fantasy players must belong to the contest sport and participating teams' USING ERRCODE = 'check_violation';
  END IF;
  IF salary_sum > contest.salary_cap THEN
    RAISE EXCEPTION 'fantasy lineup exceeds the salary cap' USING ERRCODE = 'check_violation';
  END IF;

  IF contest.sport = 'cricket' THEN
    IF cardinality(ids) <> 11 OR wk_count <> 1 OR bat_count <> 4 OR ar_count <> 3 OR bowl_count <> 3 THEN
      RAISE EXCEPTION 'cricket lineup requires 11 players: 1 WK, 4 BAT, 3 AR, 3 BOWL' USING ERRCODE = 'check_violation';
    END IF;
    SELECT max(team_count) INTO max_team_count
    FROM (
      SELECT count(*) AS team_count
      FROM fantasy_players
      WHERE id = ANY(ids)
      GROUP BY team
    ) counts;
    IF COALESCE(max_team_count, 0) > 7 THEN
      RAISE EXCEPTION 'fantasy lineup allows at most 7 players from one team' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fantasy_entries_validate_lineup ON fantasy_entries;
CREATE TRIGGER fantasy_entries_validate_lineup
BEFORE INSERT OR UPDATE OF lineup, captain_id, vice_captain_id ON fantasy_entries
FOR EACH ROW EXECUTE FUNCTION validate_fantasy_entry();

CREATE INDEX IF NOT EXISTS fantasy_entries_status_idx ON fantasy_entries (contest_id, status, score DESC);
CREATE INDEX IF NOT EXISTS fantasy_player_stats_player_idx ON fantasy_player_stats (player_id);

CREATE OR REPLACE FUNCTION protect_fantasy_settlement() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'fantasy settlement records are append-only' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fantasy_settlements_append_only ON fantasy_settlements;
CREATE TRIGGER fantasy_settlements_append_only
BEFORE UPDATE OR DELETE ON fantasy_settlements
FOR EACH ROW EXECUTE FUNCTION protect_fantasy_settlement();

CREATE OR REPLACE FUNCTION protect_settled_fantasy_entry() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'settled' THEN
    RAISE EXCEPTION 'settled fantasy entries are immutable' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS settled_fantasy_entries_immutable ON fantasy_entries;
CREATE TRIGGER settled_fantasy_entries_immutable
BEFORE UPDATE ON fantasy_entries
FOR EACH ROW EXECUTE FUNCTION protect_settled_fantasy_entry();

-- ---------------------------------------------------------------------------
-- 11. Security history and query indexes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prevent_login_history_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'login history is append-only' USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS login_history_append_only ON login_history;
CREATE TRIGGER login_history_append_only
BEFORE UPDATE OR DELETE ON login_history
FOR EACH ROW EXECUTE FUNCTION prevent_login_history_mutation();

CREATE INDEX IF NOT EXISTS login_history_email_idx ON login_history (lower(email), created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_active_idx ON sessions (expires_at) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS notifications_unread_idx ON notifications (account_id, created_at DESC) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS support_tickets_account_idx ON support_tickets (account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_events (entity_type, entity_id, created_at DESC);
