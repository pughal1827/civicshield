-- ================================================================
-- CIVICSHIELD AI - DATABASE INITIALIZATION SCHEMA MIGRATION
-- Migration File: 001_initial_schema.sql
-- ================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. DEPARTMENTS TABLE
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(20) NOT NULL UNIQUE,
    contact_email VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(20),
    role VARCHAR(30) NOT NULL CHECK (role IN ('CITIZEN', 'AUTHORITY', 'ADMIN')),
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MASTER INCIDENTS TABLE
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(20) NOT NULL UNIQUE, -- e.g., "CS-1042"
    title VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'ROAD_POTHOLE',
        'GARBAGE_OVERFLOW',
        'BROKEN_STREETLIGHT',
        'WATER_LEAKAGE',
        'DRAINAGE_BLOCKAGE',
        'TRAFFIC_SIGNAL_DAMAGED',
        'PUBLIC_INFRA_DAMAGE'
    )),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(30) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN (
        'SUBMITTED',
        'AI_ANALYSED',
        'ASSIGNED',
        'IN_PROGRESS',
        'RESOLVED',
        'CITIZEN_VERIFICATION',
        'VERIFIED'
    )),
    priority_score INT NOT NULL DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 100),
    priority_factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address TEXT NOT NULL,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    assigned_officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    report_count INT NOT NULL DEFAULT 1,
    affected_citizens_count INT NOT NULL DEFAULT 1,
    is_duplicate_flagged BOOLEAN DEFAULT FALSE,
    master_incident_id UUID REFERENCES incidents(id) ON DELETE SET NULL, -- Self-referencing link if merged
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);

-- 5. CITIZEN REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL allows anonymous submission
    tracking_code UUID NOT NULL DEFAULT uuid_generate_v4(), -- Secure unique tracker for citizens
    raw_description TEXT NOT NULL,
    image_url TEXT,
    audio_url TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    address_text TEXT,
    is_original_report BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI ANALYSES METADATA TABLE
CREATE TABLE IF NOT EXISTS ai_analyses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    raw_ai_response JSONB NOT NULL,
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score BETWEEN 0.0 AND 1.0),
    detected_category VARCHAR(50) NOT NULL,
    detected_severity VARCHAR(20) NOT NULL,
    suggested_department_code VARCHAR(20) NOT NULL,
    extracted_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. EMBEDDINGS TABLE (pgvector 768d matching text-embedding-004)
CREATE TABLE IF NOT EXISTS embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    embedding vector(768) NOT NULL, -- 768 dimensions for Google text-embedding-004
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. DUPLICATE RELATIONS TABLE (Human-in-the-Loop Triage Queue)
CREATE TABLE IF NOT EXISTS duplicate_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    candidate_incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4) NOT NULL CHECK (similarity_score BETWEEN 0.0 AND 1.0),
    distance_meters DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_duplicate_pair UNIQUE (target_incident_id, candidate_incident_id)
);

-- 9. RESOLUTION EVIDENCE TABLE
CREATE TABLE IF NOT EXISTS resolution_evidence (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    officer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    proof_image_url TEXT NOT NULL,
    resolution_notes TEXT NOT NULL,
    citizen_verified BOOLEAN DEFAULT FALSE,
    citizen_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. AUDIT LOGS TABLE
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_category ON incidents(category);
CREATE INDEX IF NOT EXISTS idx_incidents_department ON incidents(department_id);
CREATE INDEX IF NOT EXISTS idx_incidents_assigned_officer ON incidents(assigned_officer_id);
CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_location ON incidents(latitude, longitude);

CREATE INDEX IF NOT EXISTS idx_reports_incident ON reports(incident_id);
CREATE INDEX IF NOT EXISTS idx_reports_tracking_code ON reports(tracking_code);

CREATE INDEX IF NOT EXISTS idx_duplicate_relations_pending ON duplicate_relations(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_duplicate_target ON duplicate_relations(target_incident_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_candidate ON duplicate_relations(candidate_incident_id);

-- Cosine Distance Vector Index for pgvector
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ================================================================
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Public / Citizen Read Policies (Public incident search & tracking)
CREATE POLICY "Public Read Incidents" ON incidents
    FOR SELECT USING (true);

CREATE POLICY "Public Create Reports" ON reports
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Public Read Reports via Tracking" ON reports
    FOR SELECT USING (true);

CREATE POLICY "Public Read Resolution Evidence" ON resolution_evidence
    FOR SELECT USING (true);

-- 2. Authority & Admin Policies (Full management operational scope)
CREATE POLICY "Authority Read All Tables" ON departments FOR SELECT USING (true);

CREATE POLICY "Admin All Departments" ON departments FOR ALL USING (
    (SELECT role FROM users WHERE users.id = auth.uid()) = 'ADMIN'
);

CREATE POLICY "Service Role Full Access Incidents" ON incidents FOR ALL USING (true);
CREATE POLICY "Service Role Full Access Reports" ON reports FOR ALL USING (true);
CREATE POLICY "Service Role Full Access AI Analyses" ON ai_analyses FOR ALL USING (true);
CREATE POLICY "Service Role Full Access Embeddings" ON embeddings FOR ALL USING (true);
CREATE POLICY "Service Role Full Access Duplicate Relations" ON duplicate_relations FOR ALL USING (true);
CREATE POLICY "Service Role Full Access Resolution Evidence" ON resolution_evidence FOR ALL USING (true);
CREATE POLICY "Service Role Full Access Audit Logs" ON audit_logs FOR ALL USING (true);

-- ================================================================
-- TRIGGER FOR AUTOMATIC UPDATED_AT TIMESTAMP
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
