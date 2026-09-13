import { createAdminClient } from '../lib/db/supabase-admin';
import { analyzeCivicIssue } from '../lib/ai/gemini';
import { calculatePriorityScore } from '../lib/priority/priority-engine';

async function testSubmitPipeline() {
  console.log('=== DEBUGGING SUBMIT PIPELINE ===\n');

  console.log('Environment Variables Check:');
  console.log('NEXT_PUBLIC_SUPABASE_URL present:', Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL));
  console.log('SUPABASE_SERVICE_ROLE_KEY present:', Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY));
  console.log('GEMINI_API_KEY present:', Boolean(process.env.GEMINI_API_KEY));

  // 1. Test AI call
  console.log('\n--- 1. Testing AI Analysis ---');
  try {
    const aiRes = await analyzeCivicIssue('Large pothole near school gate. Motorcycles falling.', undefined);
    console.log('AI Analysis Result:', { isFallback: aiRes.isFallback, category: aiRes.analysis.category, severity: aiRes.analysis.severity });
  } catch (err) {
    console.error('AI Analysis Exception:', err);
  }

  // 2. Test Priority Engine
  console.log('\n--- 2. Testing Priority Engine ---');
  try {
    const prioRes = calculatePriorityScore({
      category: 'ROAD_POTHOLE',
      aiSeverity: 'HIGH',
      aiSafetyRiskScore: 80,
      description: 'Large pothole near school gate. Motorcycles falling.',
      addressText: 'Main Gate Road',
      reportCount: 1,
      affectedCitizensCount: 1,
    });
    console.log('Priority Score Result:', prioRes.priorityScore, prioRes.priorityLevel);
  } catch (err) {
    console.error('Priority Engine Exception:', err);
  }

  // 3. Test Supabase Database Insert
  console.log('\n--- 3. Testing Supabase Admin DB Client ---');
  try {
    const supabase = createAdminClient();
    const caseId = `CS-TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data: incident, error: incErr } = await supabase
      .from('incidents')
      .insert({
        case_id: caseId,
        title: 'Test Incident',
        summary: 'Test summary description',
        category: 'ROAD_POTHOLE',
        severity: 'HIGH',
        status: 'AI_ANALYSED',
        priority_score: 80,
        priority_factors: { explanation: 'Test' },
        latitude: 12.9715,
        longitude: 77.5945,
        address: 'Test Address',
        department_id: '11111111-1111-1111-1111-111111111111',
        report_count: 1,
        affected_citizens_count: 1,
        is_duplicate_flagged: false,
      })
      .select()
      .single();

    if (incErr) {
      console.error('Supabase DB Insert Error:', incErr);
    } else {
      console.log('Supabase DB Insert SUCCESS:', incident.id, incident.case_id);
    }
  } catch (err) {
    console.error('Supabase Exception:', err);
  }
}

testSubmitPipeline().catch(console.error);
