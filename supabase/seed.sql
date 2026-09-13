-- ================================================================
-- CIVICSHIELD AI - DEMO SEED DATA
-- Seed File: seed.sql
-- ================================================================

-- Clear existing data
TRUNCATE TABLE audit_logs, resolution_evidence, duplicate_relations, embeddings, ai_analyses, reports, incidents, users, departments CASCADE;

-- 1. SEED DEPARTMENTS
INSERT INTO departments (id, name, code, contact_email) VALUES
('11111111-1111-1111-1111-111111111111', 'Road Maintenance Department', 'ROAD_MAINT', 'roads@civicshield.ai'),
('22222222-2222-2222-2222-222222222222', 'Sanitation & Waste Management', 'SANITATION', 'sanitation@civicshield.ai'),
('33333333-3333-3333-3333-333333333333', 'Electrical Department', 'ELECTRICAL', 'electrical@civicshield.ai'),
('44444444-4444-4444-4444-444444444444', 'Water Supply Board', 'WATER_DEPT', 'water@civicshield.ai'),
('55555555-5555-5555-5555-555555555555', 'Drainage & Sewerage Department', 'DRAINAGE', 'drainage@civicshield.ai');

-- 2. SEED USERS
INSERT INTO users (id, email, full_name, role, department_id) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@civicshield.ai', 'Platform Administrator', 'ADMIN', NULL),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'officer.roads@civicshield.ai', 'Officer Marcus Vance', 'AUTHORITY', '11111111-1111-1111-1111-111111111111'),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'officer.sanitation@civicshield.ai', 'Officer Sarah Jenkins', 'AUTHORITY', '22222222-2222-2222-2222-222222222222'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'citizen.alice@civicshield.ai', 'Alice Walker', 'CITIZEN', NULL);

-- 3. SEED MASTER INCIDENT CS-1042 (Primary Demo Incident)
INSERT INTO incidents (
    id, case_id, title, summary, category, severity, status, 
    priority_score, priority_factors, latitude, longitude, address, 
    department_id, assigned_officer_id, report_count, affected_citizens_count, is_duplicate_flagged
) VALUES (
    'i1111111-1111-1111-1111-111111111111',
    'CS-1042',
    'Dangerous pothole near St. Jude School Gate',
    'Large asphalt crater near school main entrance disrupting vehicle flow and creating risk for children.',
    'ROAD_POTHOLE',
    'CRITICAL',
    'ASSIGNED',
    87,
    '{"safetyRisk": 27, "publicImpact": 21, "severity": 20, "recurrence": 10, "locationSensitivity": 9}'::jsonb,
    12.97159870,
    77.59456270,
    'St. Jude High School Gate, 4th Main Road',
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    2,
    2,
    TRUE
);

-- 4. SEED REPORTS FOR CS-1042 (One Master Incident -> Multiple Reports)
-- Report A (Original Citizen Submission)
INSERT INTO reports (
    id, incident_id, reporter_id, tracking_code, raw_description, image_url, latitude, longitude, address_text, is_original_report
) VALUES (
    'r1111111-1111-1111-1111-111111111111',
    'i1111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    't1111111-1111-1111-1111-111111111111',
    'There is a huge pothole right in front of the St. Jude School main gate. Cars and school buses are swerving dangerously.',
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800',
    12.97159870,
    77.59456270,
    'St. Jude High School Gate, 4th Main Road',
    TRUE
);

-- Report B (Candidate Duplicate Submission)
INSERT INTO reports (
    id, incident_id, reporter_id, tracking_code, raw_description, image_url, latitude, longitude, address_text, is_original_report
) VALUES (
    'r2222222-2222-2222-2222-222222222222',
    'i1111111-1111-1111-1111-111111111111',
    NULL, -- Anonymous citizen submission
    't2222222-2222-2222-2222-222222222222',
    'Deep road crater beside the school entrance causing traffic jams and vehicle damage.',
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
    12.97165000,
    77.59460000,
    '4th Main Road near school entrance',
    FALSE
);

-- 5. SEED CANDIDATE INCIDENT FOR DUPLICATE REVIEW DEMO QUEUE
INSERT INTO incidents (
    id, case_id, title, summary, category, severity, status, 
    priority_score, priority_factors, latitude, longitude, address, 
    department_id, report_count, affected_citizens_count, is_duplicate_flagged
) VALUES (
    'i2222222-2222-2222-2222-222222222222',
    'CS-1043',
    'Deep road crater beside school entrance',
    'Road damage near entrance causing vehicle slow downs.',
    'ROAD_POTHOLE',
    'HIGH',
    'SUBMITTED',
    76,
    '{"safetyRisk": 24, "publicImpact": 18, "severity": 15, "recurrence": 10, "locationSensitivity": 9}'::jsonb,
    12.97165000,
    77.59460000,
    '4th Main Road near school entrance',
    '11111111-1111-1111-1111-111111111111',
    1,
    1,
    TRUE
);

-- 6. SEED DUPLICATE RELATION (Human Review Queue)
INSERT INTO duplicate_relations (
    id, target_incident_id, candidate_incident_id, similarity_score, distance_meters, status
) VALUES (
    'd1111111-1111-1111-1111-111111111111',
    'i1111111-1111-1111-1111-111111111111', -- Master CS-1042
    'i2222222-2222-2222-2222-222222222222', -- Candidate CS-1043
    0.8950,
    14.50,
    'PENDING'
);

-- 7. SEED SECOND INCIDENT (Garbage Overflow - Medium Priority)
INSERT INTO incidents (
    id, case_id, title, summary, category, severity, status, 
    priority_score, priority_factors, latitude, longitude, address, 
    department_id, assigned_officer_id, report_count
) VALUES (
    'i3333333-3333-3333-3333-333333333333',
    'CS-1040',
    'Uncollected garbage bin overflowing into street',
    'Large pile of uncollected plastic and organic waste blocking pedestrian walkway.',
    'GARBAGE_OVERFLOW',
    'MEDIUM',
    'IN_PROGRESS',
    58,
    '{"safetyRisk": 15, "publicImpact": 18, "severity": 10, "recurrence": 10, "locationSensitivity": 5}'::jsonb,
    12.97500000,
    77.59800000,
    'Market Square 2nd Cross',
    '22222222-2222-2222-2222-222222222222',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    1
);

-- 8. SEED THIRD INCIDENT (Resolved Streetlight with Evidence)
INSERT INTO incidents (
    id, case_id, title, summary, category, severity, status, 
    priority_score, priority_factors, latitude, longitude, address, 
    department_id, assigned_officer_id, report_count, resolved_at
) VALUES (
    'i4444444-4444-4444-4444-444444444444',
    'CS-1038',
    'Broken streetlight pole creating unsafe dark passage',
    'Non-functioning LED lamp on pole #4B creating nighttime hazard.',
    'BROKEN_STREETLIGHT',
    'MEDIUM',
    'RESOLVED',
    52,
    '{"safetyRisk": 15, "publicImpact": 12, "severity": 10, "recurrence": 10, "locationSensitivity": 5}'::jsonb,
    12.98000000,
    77.60000000,
    'Oak Avenue Lane 3',
    '33333333-3333-3333-3333-333333333333',
    NULL,
    1,
    NOW() - INTERVAL '4 hours'
);

-- 9. SEED RESOLUTION EVIDENCE FOR CS-1038
INSERT INTO resolution_evidence (
    id, incident_id, officer_id, proof_image_url, resolution_notes, citizen_verified
) VALUES (
    'e1111111-1111-1111-1111-111111111111',
    'i4444444-4444-4444-4444-444444444444',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=800',
    'Replaced damaged LED fixture and inspected power relay wiring. Pole #4B tested fully operational.',
    TRUE
);
