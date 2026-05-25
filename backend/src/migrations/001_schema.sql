-- ============================================================
--  Wellness Platform — Full Application Schema
--  Migration 001 — run once, all statements are idempotent
-- ============================================================

-- ─── 1. EXTEND user_profiles ────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS date_of_birth    DATE,
  ADD COLUMN IF NOT EXISTS gender           TEXT,
  ADD COLUMN IF NOT EXISTS profile_picture_url TEXT,
  ADD COLUMN IF NOT EXISTS emirates_id      TEXT,
  ADD COLUMN IF NOT EXISTS blood_group      TEXT,
  ADD COLUMN IF NOT EXISTS height_cm        FLOAT,
  ADD COLUMN IF NOT EXISTS weight_kg        FLOAT,
  ADD COLUMN IF NOT EXISTS nationality      TEXT,
  ADD COLUMN IF NOT EXISTS allergies        TEXT[]        DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS chronic_conditions TEXT[]      DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS medications      JSONB         DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS fcm_token        TEXT;

-- ─── 2. FAMILY MEMBERS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS family_members (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  relationship     TEXT NOT NULL,       -- 'spouse', 'child', 'parent', etc.
  date_of_birth    DATE,
  gender           TEXT,
  emirates_id      TEXT,
  blood_group      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. INSURANCE CARDS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS insurance_cards (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider_name    TEXT NOT NULL,
  policy_number    TEXT NOT NULL,
  member_id        TEXT,
  expiry_date      DATE,
  card_image_url   TEXT,
  is_primary       BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. DOCTORS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctors (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  specialization   TEXT NOT NULL,
  license_number   TEXT UNIQUE NOT NULL,
  bio              TEXT,
  consultation_fee NUMERIC(10, 2) DEFAULT 0,
  languages        TEXT[]        DEFAULT '{}',
  consultation_types TEXT[]      DEFAULT '{video,clinic}', -- 'video', 'clinic'
  average_rating   FLOAT         DEFAULT 0,
  total_reviews    INT           DEFAULT 0,
  status           TEXT          DEFAULT 'pending',    -- 'pending', 'approved', 'rejected'
  rejection_reason TEXT,
  years_experience INT           DEFAULT 0,
  created_at       TIMESTAMPTZ   DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   DEFAULT NOW()
);

-- ─── 5. DOCTOR DOCUMENTS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_documents (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  document_type    TEXT NOT NULL,   -- 'license', 'degree', 'emirates_id', 'other'
  document_url     TEXT NOT NULL,
  uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. APPOINTMENT SLOTS (weekly availability) ─────────────
CREATE TABLE IF NOT EXISTS appointment_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id        UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week      SMALLINT NOT NULL,  -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  slot_duration_min INT DEFAULT 30,
  consultation_type TEXT DEFAULT 'video',  -- 'video' or 'clinic'
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. APPOINTMENTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  doctor_id           UUID NOT NULL REFERENCES doctors(id),
  family_member_id    UUID REFERENCES family_members(id),  -- null = appointment for self
  scheduled_at        TIMESTAMPTZ NOT NULL,
  duration_min        INT DEFAULT 30,
  consultation_type   TEXT DEFAULT 'video',   -- 'video' or 'clinic'
  status              TEXT DEFAULT 'confirmed',  -- 'confirmed', 'completed', 'cancelled', 'no_show'
  reason              TEXT,                   -- patient's stated reason
  notes               TEXT,                   -- doctor's notes post-consultation
  livekit_room_name   TEXT,                   -- set for video consultations
  payment_status      TEXT DEFAULT 'pending', -- 'pending', 'paid', 'refunded'
  amount_paid         NUMERIC(10, 2),
  cancelled_by        TEXT,                   -- 'patient' or 'doctor'
  cancel_reason       TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor  ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_time    ON appointments(scheduled_at);

-- ─── 8. DOCTOR REVIEWS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS doctor_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id      UUID UNIQUE NOT NULL REFERENCES appointments(id),
  patient_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  doctor_id           UUID NOT NULL REFERENCES doctors(id),
  rating              SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment             TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. LAB TESTS (catalogue) ───────────────────────────────
CREATE TABLE IF NOT EXISTS lab_tests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,              -- 'blood', 'urine', 'imaging', 'cardiac', etc.
  preparation      TEXT,              -- fasting instructions etc.
  turnaround_hours INT DEFAULT 24,
  price            NUMERIC(10, 2) NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. LAB BOOKINGS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  lab_test_id         UUID NOT NULL REFERENCES lab_tests(id),
  family_member_id    UUID REFERENCES family_members(id),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  collection_type     TEXT DEFAULT 'clinic',  -- 'clinic' or 'home'
  address             TEXT,                   -- for home collection
  status              TEXT DEFAULT 'confirmed', -- 'confirmed', 'sample_collected', 'processing', 'completed', 'cancelled'
  payment_status      TEXT DEFAULT 'pending',
  amount_paid         NUMERIC(10, 2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lab_bookings_patient ON lab_bookings(patient_profile_id);

-- ─── 11. LAB RESULTS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_booking_id   UUID UNIQUE NOT NULL REFERENCES lab_bookings(id),
  result_pdf_url   TEXT,
  summary          TEXT,
  is_normal        BOOLEAN,
  uploaded_by      UUID REFERENCES user_profiles(id),  -- admin who uploaded
  uploaded_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. VACCINES (catalogue) ───────────────────────────────
CREATE TABLE IF NOT EXISTS vaccines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,     -- 'childhood', 'travel', 'annual', 'covid', etc.
  doses_required   INT DEFAULT 1,
  price            NUMERIC(10, 2) NOT NULL,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 13. VACCINATION BOOKINGS ───────────────────────────────
CREATE TABLE IF NOT EXISTS vaccination_bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  vaccine_id          UUID NOT NULL REFERENCES vaccines(id),
  family_member_id    UUID REFERENCES family_members(id),
  scheduled_at        TIMESTAMPTZ NOT NULL,
  location_type       TEXT DEFAULT 'clinic',  -- 'clinic' or 'home'
  address             TEXT,
  dose_number         INT DEFAULT 1,
  status              TEXT DEFAULT 'confirmed',  -- 'confirmed', 'administered', 'cancelled'
  payment_status      TEXT DEFAULT 'pending',
  amount_paid         NUMERIC(10, 2),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 14. MEDICINES (pharmacy catalogue) ─────────────────────
CREATE TABLE IF NOT EXISTS medicines (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  generic_name         TEXT,
  description          TEXT,
  category             TEXT,        -- 'tablet', 'syrup', 'injection', 'cream', etc.
  manufacturer         TEXT,
  requires_prescription BOOLEAN DEFAULT FALSE,
  price                NUMERIC(10, 2) NOT NULL,
  stock_quantity       INT DEFAULT 0,
  image_url            TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 15. PRESCRIPTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  doctor_id           UUID REFERENCES doctors(id),        -- null if uploaded manually
  appointment_id      UUID REFERENCES appointments(id),
  image_url           TEXT,
  notes               TEXT,
  status              TEXT DEFAULT 'pending',  -- 'pending', 'verified', 'rejected', 'expired'
  rejection_reason    TEXT,
  expiry_date         DATE,
  verified_by         UUID REFERENCES user_profiles(id),  -- admin who verified
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 16. MEDICINE ORDERS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicine_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  prescription_id     UUID REFERENCES prescriptions(id),
  delivery_address    TEXT,
  delivery_type       TEXT DEFAULT 'delivery',  -- 'delivery' or 'pickup'
  status              TEXT DEFAULT 'placed',    -- 'placed', 'confirmed', 'dispatched', 'delivered', 'cancelled'
  subtotal            NUMERIC(10, 2) NOT NULL,
  delivery_fee        NUMERIC(10, 2) DEFAULT 0,
  total_amount        NUMERIC(10, 2) NOT NULL,
  payment_method      TEXT DEFAULT 'wallet',    -- 'wallet', 'card', 'cash'
  payment_status      TEXT DEFAULT 'pending',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_medicine_orders_patient ON medicine_orders(patient_profile_id);

-- ─── 17. ORDER ITEMS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID NOT NULL REFERENCES medicine_orders(id) ON DELETE CASCADE,
  medicine_id      UUID NOT NULL REFERENCES medicines(id),
  quantity         INT NOT NULL,
  unit_price       NUMERIC(10, 2) NOT NULL,  -- snapshotted at order time
  subtotal         NUMERIC(10, 2) NOT NULL
);

-- ─── 18. WALLETS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID UNIQUE NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  balance          NUMERIC(10, 2) DEFAULT 0 CHECK (balance >= 0),
  currency         TEXT DEFAULT 'AED',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 19. WALLET TRANSACTIONS ────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id        UUID NOT NULL REFERENCES wallets(id),
  type             TEXT NOT NULL,  -- 'credit', 'debit'
  category         TEXT NOT NULL,  -- 'topup', 'appointment', 'lab', 'pharmacy', 'vaccine', 'refund'
  amount           NUMERIC(10, 2) NOT NULL,
  balance_after    NUMERIC(10, 2) NOT NULL,
  reference_id     UUID,           -- appointment_id, order_id, etc.
  description      TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallet_tx_wallet ON wallet_transactions(wallet_id);

-- ─── 20. NOTIFICATIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  type             TEXT,           -- 'appointment', 'lab', 'pharmacy', 'general'
  reference_id     UUID,
  is_read          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_profile_id, is_read);

-- ─── 21. SUPPORT TICKETS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  subject          TEXT NOT NULL,
  description      TEXT NOT NULL,
  category         TEXT,           -- 'billing', 'appointment', 'technical', 'general'
  status           TEXT DEFAULT 'open',  -- 'open', 'in_progress', 'resolved', 'closed'
  admin_response   TEXT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 22. SOS EVENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sos_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id),
  latitude         FLOAT,
  longitude        FLOAT,
  address          TEXT,
  status           TEXT DEFAULT 'active',  -- 'active', 'resolved'
  resolved_by      UUID REFERENCES user_profiles(id),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 23. WELLNESS DATA (JSONB — covers all tracking types) ──
-- data_type: 'fitness_assessment' | 'workout_log' | 'food_log' | 'weight_log'
--            'period_log' | 'pregnancy_log' | 'water_log'
CREATE TABLE IF NOT EXISTS wellness_data (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  data_type        TEXT NOT NULL,
  payload          JSONB NOT NULL,
  logged_at        TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wellness_user_type
  ON wellness_data(user_profile_id, data_type, logged_at DESC);
