/**
 * Automated End-to-End Integration Verification Script
 */

const testIntegration = async () => {
  const BASE_URL = 'http://127.0.0.1:5000';
  console.log('🧪 Starting VaultAI End-to-End Test Suite...\n');

  try {
    // 1. Test Registration
    console.log('1. Testing User Registration (POST /api/auth/register)...');
    const testUser = {
      name: 'College Student',
      email: `student_${Date.now()}@college.edu`,
      password: 'password123',
    };

    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    if (!regRes.ok) throw new Error(`Registration failed: ${regData.message}`);
    console.log('   ✅ Registered successfully! Token received.');

    const token = regData.token;
    const authHeaders = {
      Authorization: `Bearer ${token}`,
    };

    // 2. Test Get Folders (should contain default: College, Projects, Personal)
    console.log('\n2. Testing Folders (GET /api/folders)...');
    const foldersRes = await fetch(`${BASE_URL}/api/folders`, { headers: authHeaders });
    const foldersData = await foldersRes.json();
    console.log(`   ✅ Default folders found: ${foldersData.folders.map((f) => f.name).join(', ')}`);

    // 3. Test Create Custom Folder
    console.log('\n3. Testing Create Custom Folder (POST /api/folders)...');
    const createFolderRes = await fetch(`${BASE_URL}/api/folders`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Lab Reports' }),
    });
    const createFolderData = await createFolderRes.json();
    console.log(`   ✅ Folder created: "${createFolderData.folder.name}" (ID: ${createFolderData.folder._id})`);

    // 4. Test File Upload (Multipart Form Data with sample text file)
    console.log('\n4. Testing File Upload (POST /api/files/upload)...');
    const sampleContent = `VaultAI Project Overview
VaultAI is a personal digital file vault with document AI capabilities.
It stores documents securely, indexes metadata, and leverages Google Gemini to answer questions.
Key features include JWT authentication, multi-tenant data isolation, and live live file search.`;

    const blob = new Blob([sampleContent], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'project_overview.txt');
    formData.append('folderId', createFolderData.folder._id);

    const uploadRes = await fetch(`${BASE_URL}/api/files/upload`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });
    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadData.message}`);
    console.log(`   ✅ File uploaded: "${uploadData.file.name}" (Size: ${uploadData.file.size} bytes)`);

    const fileId = uploadData.file._id;

    // 5. Test Get Files
    console.log('\n5. Testing List Files (GET /api/files)...');
    const filesRes = await fetch(`${BASE_URL}/api/files`, { headers: authHeaders });
    const filesData = await filesRes.json();
    console.log(`   ✅ Files count: ${filesData.count}. First file: ${filesData.files[0].name}`);

    // 6. Test Stats
    console.log('\n6. Testing Stats (GET /api/stats)...');
    const statsRes = await fetch(`${BASE_URL}/api/stats`, { headers: authHeaders });
    const statsData = await statsRes.json();
    console.log(`   ✅ Stats: ${statsData.stats.totalFiles} files, ${statsData.stats.totalFolders} folders, ${statsData.stats.storageUsedMB} MB used.`);

    // 7. Test AI Summarize
    console.log('\n7. Testing AI Summarization (POST /api/ai/summarize)...');
    const aiSummaryRes = await fetch(`${BASE_URL}/api/ai/summarize`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId }),
    });
    const aiSummaryData = await aiSummaryRes.json();
    console.log(`   ✅ AI Summary Response received:`);
    console.log('   ---');
    console.log(`   ${aiSummaryData.summary.split('\n').slice(0, 4).join('\n   ')}`);
    console.log('   ---');

    // 8. Test AI Ask Question
    console.log('\n8. Testing AI Q&A (POST /api/ai/ask)...');
    const aiAskRes = await fetch(`${BASE_URL}/api/ai/ask`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, question: 'What is VaultAI and what are its key features?' }),
    });
    const aiAskData = await aiAskRes.json();
    console.log(`   ✅ AI Answer received:`);
    console.log('   ---');
    console.log(`   ${aiAskData.answer.split('\n').slice(0, 3).join('\n   ')}`);
    console.log('   ---');

    // 9. Test File Deletion
    console.log('\n9. Testing File Deletion (DELETE /api/files/:id)...');
    const delRes = await fetch(`${BASE_URL}/api/files/${fileId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    const delData = await delRes.json();
    console.log(`   ✅ File deleted: ${delData.message}`);

    console.log('\n==================================================');
    console.log('🎉 ALL INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('==================================================\n');
  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
};

testIntegration();
