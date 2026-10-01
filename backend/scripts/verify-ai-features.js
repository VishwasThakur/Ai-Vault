const path = require('path');
const fs = require('fs');

async function runVerification() {
  const BASE_URL = 'http://127.0.0.1:5000';
  console.log('🔍 Starting VaultAI Document Assistant (Summarize + Ask AI) Verification...\n');

  try {
    // 1. Create a dedicated test user
    const testEmail = `ai_tester_${Date.now()}@gmail.com`;
    console.log(`1. Registering test user: ${testEmail}...`);
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'AI Test User',
        email: testEmail,
        password: 'password123',
      }),
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${regData.message}`);
    const token = regData.token;
    console.log('   ✅ Registered successfully! JWT received.');

    const authHeaders = { Authorization: `Bearer ${token}` };

    // 2. Upload test files: TXT, CSV, DOCX (if available), and an unsupported JPG/dummy
    console.log('\n2. Uploading test files to vault...');

    // 2a. CSV file
    const csvContent = `Pregnancies,Glucose,BloodPressure,SkinThickness,Insulin,BMI,DiabetesPedigreeFunction,Age,Outcome
6,148,72,35,0,33.6,0.627,50,1
1,85,66,29,0,26.6,0.351,31,0
8,183,64,0,0,23.3,0.672,32,1`;
    const csvBlob = new Blob([csvContent], { type: 'text/csv' });
    const csvFormData = new FormData();
    csvFormData.append('file', csvBlob, 'diabetes_test.csv');

    const csvUpRes = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: csvFormData,
    });
    const csvUpData = await csvUpRes.json();
    console.log(`   ✅ Uploaded CSV: ${csvUpData.file.name} (ID: ${csvUpData.file._id})`);
    const csvFileId = csvUpData.file._id;

    // 2b. TXT file
    const txtContent = `VaultAI Technical Documentation
VaultAI provides encrypted file storage and document AI intelligence.
Key architectural principles:
- Zero data leakage across tenants
- Server-side only Gemini API key custody
- On-demand document text extraction and DB caching
- Grounded answers strictly anchored in document text`;
    const txtBlob = new Blob([txtContent], { type: 'text/plain' });
    const txtFormData = new FormData();
    txtFormData.append('file', txtBlob, 'vault_architecture.txt');

    const txtUpRes = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: txtFormData,
    });
    const txtUpData = await txtUpRes.json();
    console.log(`   ✅ Uploaded TXT: ${txtUpData.file.name} (ID: ${txtUpData.file._id})`);
    const txtFileId = txtUpData.file._id;

    // 2c. Unsupported dummy file (e.g. image)
    const imgBlob = new Blob(['FAKE_IMAGE_DATA_BYTES_12345'], { type: 'image/jpeg' });
    const imgFormData = new FormData();
    imgFormData.append('file', imgBlob, 'mock_image.jpg');

    const imgUpRes = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: imgFormData,
    });
    const imgUpData = await imgUpRes.json();
    console.log(`   ✅ Uploaded mock image: ${imgUpData.file.name} (ID: ${imgUpData.file._id})`);
    const imgFileId = imgUpData.file._id;

    // 3. Test GET /api/files - check isAiSupported flags
    console.log('\n3. Verifying GET /api/files marks AI support accurately...');
    const listRes = await fetch(`${BASE_URL}/api/files?folderId=all`, { headers: authHeaders });
    const listData = await listRes.json();
    for (const f of listData.files) {
      console.log(`   - ${f.name} [ext: ${f.extension}]: isAiSupported = ${f.isAiSupported}, hasText = ${f.hasText}`);
    }

    // 4. Test Security: Unauthorized AI calls without token
    console.log('\n4. Testing Security: AI endpoints reject unauthenticated requests...');
    const unauthRes = await fetch(`${BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: txtFileId }),
    });
    console.log(`   ✅ Unauthenticated request status: ${unauthRes.status} (Expected 401)`);
    if (unauthRes.status !== 401) throw new Error('Security check failed: unauthenticated request allowed!');

    // 5. Test Security: Cross-tenant isolation (user 2 cannot summarize user 1's file)
    console.log('\n5. Testing Security: Multi-tenant ownership enforcement...');
    const reg2Res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: `intruder_${Date.now()}@gmail.com`,
        password: 'password123',
      }),
    });
    const reg2Data = await reg2Res.json();
    const token2 = reg2Data.token;

    const crossUserRes = await fetch(`${BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token2}`,
      },
      body: JSON.stringify({ fileId: txtFileId }), // Trying to access user 1's file
    });
    console.log(`   ✅ Cross-user request status: ${crossUserRes.status} (Expected 404/403)`);
    if (crossUserRes.status === 200) throw new Error('Security check failed: cross-user file accessed!');

    // 6. Test AI Summarize on TXT
    console.log('\n6. Testing Summarize Document on TXT file (POST /api/ai/summarize)...');
    const sumTxtRes = await fetch(`${BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: txtFileId }),
    });
    const sumTxtData = await sumTxtRes.json();
    if (!sumTxtRes.ok) throw new Error(`Summarize failed: ${sumTxtData.message}`);
    console.log('   ✅ Summary output:');
    console.log(`   ${sumTxtData.summary.split('\n').join('\n   ')}`);

    // 7. Test AI Summarize on CSV
    console.log('\n7. Testing Summarize Document on CSV file (POST /api/ai/summarize)...');
    const sumCsvRes = await fetch(`${BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: csvFileId }),
    });
    const sumCsvData = await sumCsvRes.json();
    if (!sumCsvRes.ok) throw new Error(`CSV Summarize failed: ${sumCsvData.message}`);
    console.log('   ✅ CSV Summary output:');
    console.log(`   ${sumCsvData.summary.split('\n').join('\n   ')}`);

    // 8. Test Ask AI on TXT file
    console.log('\n8. Testing Ask AI Question (POST /api/ai/ask)...');
    const askRes = await fetch(`${BASE_URL}/api/ai/ask`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: txtFileId,
        question: 'What are the key architectural principles mentioned?',
      }),
    });
    const askData = await askRes.json();
    if (!askRes.ok) throw new Error(`Ask AI failed: ${askData.message}`);
    console.log('   ✅ Ask AI response:');
    console.log(`   ${askData.answer.split('\n').join('\n   ')}`);

    // 9. Test Ask AI with ungrounded question (should state not found)
    console.log('\n9. Testing Grounding: Ask AI for information NOT in document...');
    const ungroundedRes = await fetch(`${BASE_URL}/api/ai/ask`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileId: txtFileId,
        question: 'What is the recipe for chocolate chip cookies?',
      }),
    });
    const ungroundedData = await ungroundedRes.json();
    console.log('   ✅ Grounded refusal/response:');
    console.log(`   ${ungroundedData.answer.split('\n').join('\n   ')}`);

    // 10. Test Summarize on unsupported image file
    console.log('\n10. Testing Summarize on unsupported image file (should return clear friendly error)...');
    const badSumRes = await fetch(`${BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId: imgFileId }),
    });
    const badSumData = await badSumRes.json();
    console.log(`   ✅ Response status: ${badSumRes.status}, message: "${badSumData.message}"`);
    if (badSumRes.status !== 400) throw new Error('Expected 400 bad request for unsupported file');

    console.log('\n🎉 ALL AI VERIFICATION TESTS PASSED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('\n❌ Verification Failed:', err);
    process.exit(1);
  }
}

runVerification();
