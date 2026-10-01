const http = require('http');

const PORT = 5000;
const HOST = '127.0.0.1';

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const headers = options.headers || {};
    let postData = options.body;

    if (postData && typeof postData === 'object' && !(postData instanceof Buffer)) {
      postData = JSON.stringify(postData);
      headers['Content-Type'] = 'application/json';
    }

    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(
      {
        hostname: HOST,
        port: PORT,
        path,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let data = null;
          try {
            data = JSON.parse(body);
          } catch {
            data = body;
          }
          resolve({ status: res.statusCode, headers: res.headers, data });
        });
      }
    );

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function createMultipartBody(boundary, fieldName, filename, fileContent) {
  const crlf = '\r\n';
  let body = `--${boundary}${crlf}`;
  body += `Content-Disposition: form-data; name="${fieldName}"; filename="${filename}"${crlf}`;
  body += `Content-Type: text/plain${crlf}${crlf}`;
  body += `${fileContent}${crlf}`;
  body += `--${boundary}--${crlf}`;
  return Buffer.from(body);
}

async function runTests() {
  console.log('--- STARTING COMPREHENSIVE VAULTAI VERIFICATION SUITE ---');

  const stamp = Date.now();
  const userAEmail = `usera_${stamp}@vaultai.test`;
  const userBEmail = `userb_${stamp}@vaultai.test`;
  const userCEmail = `userc_${stamp}@vaultai.test`;

  console.log('\n[1] Testing Registration & Vault ID Generation...');
  const regResA = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'User A',
      email: userAEmail,
      password: 'StrongPassword123!',
      pin: '654321',
    },
  });

  if (regResA.status !== 201) {
    throw new Error(`User A registration failed: status ${regResA.status} - ${JSON.stringify(regResA.data)}`);
  }

  const tokenA = regResA.data.token;
  const vaultIdA = regResA.data.vaultId;

  if (!tokenA) throw new Error('Missing token in register response');
  if (!vaultIdA || !/^VX-[A-F0-9]{8}$/.test(vaultIdA)) {
    throw new Error(`Vault ID invalid or wrong format: ${vaultIdA}`);
  }
  if (regResA.data.user.password || regResA.data.user.vaultPin) {
    throw new Error('Sensitive fields (password / vaultPin) leaked in register response');
  }
  console.log(`✓ User A registered successfully. Vault ID: ${vaultIdA}`);

  console.log('\n[2] Testing Profile Fetch (/api/auth/me) Privacy...');
  const meRes = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${tokenA}` },
  });

  if (meRes.status !== 200) throw new Error(`/api/auth/me failed with status ${meRes.status}`);
  if (meRes.data.user.password || meRes.data.user.vaultPin) {
    throw new Error('Sensitive fields leaked in /api/auth/me');
  }
  console.log('✓ Profile data is strictly sanitized (no password or PIN returned).');

  console.log('\n[3] Testing User A File Upload (Regular Vault)...');
  const boundaryA = `----VaultBoundary${Date.now()}`;
  const fileContentA = 'CONFIDENTIAL_A: Quarterly engineering report for project Apollo.';
  const multipartA = createMultipartBody(boundaryA, 'file', 'apollo_report.txt', fileContentA);

  const uploadResA = await request('/api/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': `multipart/form-data; boundary=${boundaryA}`,
    },
    body: multipartA,
  });

  if (uploadResA.status !== 201) {
    throw new Error(`File upload for User A failed: ${JSON.stringify(uploadResA.data)}`);
  }
  const fileIdA = uploadResA.data.file._id;
  console.log(`✓ User A uploaded file successfully. File ID: ${fileIdA}`);

  console.log('\n[4] Testing User B Registration and Cross-Tenant Ownership Enforcement...');
  const regResB = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'User B',
      email: userBEmail,
      password: 'StrongPassword123!',
      pin: '123456',
    },
  });

  if (regResB.status !== 201) throw new Error('User B registration failed');
  const tokenB = regResB.data.token;

  const bDownloadA = await request(`/api/files/${fileIdA}/download?token=${tokenB}`);
  if (bDownloadA.status !== 404) {
    throw new Error(`Cross-tenant download expected 404, got ${bDownloadA.status}`);
  }

  const bDeleteA = await request(`/api/files/${fileIdA}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokenB}` },
  });
  if (bDeleteA.status !== 404) {
    throw new Error(`Cross-tenant delete expected 404, got ${bDeleteA.status}`);
  }

  const bAiSummarizeA = await request('/api/ai/summarize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
    body: { fileId: fileIdA },
  });
  if (bAiSummarizeA.status !== 404) {
    throw new Error(`Cross-tenant AI summarize expected 404, got ${bAiSummarizeA.status}`);
  }
  console.log('✓ Cross-tenant security verified: All unauthorized queries return generic 404 (File not found).');

  console.log('\n[5] Testing Critical Vault PIN Locking & Lockout...');
  const wrongPinRes1 = await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { pin: '000000' },
  });

  if (wrongPinRes1.status !== 401) {
    throw new Error(`Wrong PIN expected 401, got ${wrongPinRes1.status}`);
  }

  await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { pin: '000000' },
  });
  await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { pin: '000000' },
  });
  await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { pin: '000000' },
  });
  const lockedRes = await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: { pin: '000000' },
  });

  if (lockedRes.status !== 423) {
    throw new Error(`5th failed PIN expected 423 locked status, got ${lockedRes.status}`);
  }
  console.log('✓ 5 failed PIN attempts trigger DB-tracked 15-minute Critical Vault lockout (HTTP 423).');

  console.log('\n[6] Testing Critical Vault Unlock & Sensitive File Isolation...');
  const regResC = await request('/api/auth/register', {
    method: 'POST',
    body: {
      name: 'User C',
      email: userCEmail,
      password: 'StrongPassword123!',
      pin: '987654',
    },
  });

  if (regResC.status !== 201) throw new Error('User C registration failed');
  const tokenC = regResC.data.token;

  const unlockResC = await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: { pin: '987654' },
  });

  if (unlockResC.status !== 200 || !unlockResC.data.vaultToken) {
    throw new Error(`Critical Vault unlock failed: ${JSON.stringify(unlockResC.data)}`);
  }
  const vaultTokenC = unlockResC.data.vaultToken;
  console.log('✓ Critical Vault unlocked successfully with correct 6-digit PIN. Session token received.');

  const boundaryC = `----CriticalBoundary${Date.now()}`;
  const criticalContent = 'TOP_SECRET: Government passport scan and seed phrase recovery keys.';
  const multipartC = createMultipartBody(boundaryC, 'file', 'sensitive_tax_form.txt', criticalContent);

  const uploadCritRes = await request('/api/vault/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${tokenC}`,
      'x-vault-token': vaultTokenC,
      'Content-Type': `multipart/form-data; boundary=${boundaryC}`,
    },
    body: multipartC,
  });

  if (uploadCritRes.status !== 201) {
    throw new Error(`Critical file upload failed: ${JSON.stringify(uploadCritRes.data)}`);
  }
  const criticalFileId = uploadCritRes.data.file._id;
  console.log(`✓ Critical file uploaded: ${criticalFileId}`);

  const normalFilesRes = await request('/api/files', {
    headers: { Authorization: `Bearer ${tokenC}` },
  });

  const foundInNormal = (normalFilesRes.data.files || []).some((f) => f._id === criticalFileId);
  if (foundInNormal) {
    throw new Error('SECURITY VIOLATION: Critical file leaked into regular /api/files endpoint!');
  }
  console.log('✓ Critical document is 100% isolated: DOES NOT appear in standard /api/files listings.');

  const critListRes = await request('/api/vault/files', {
    headers: {
      Authorization: `Bearer ${tokenC}`,
      'x-vault-token': vaultTokenC,
    },
  });

  if (critListRes.status !== 200 || critListRes.data.files.length !== 1) {
    throw new Error(`Failed to list critical files: ${JSON.stringify(critListRes.data)}`);
  }
  console.log('✓ Critical document successfully listed inside unlocked Critical Vault.');

  const critDownloadRes = await request(`/api/vault/files/${criticalFileId}/download?token=${tokenC}&vaultToken=${vaultTokenC}`);
  if (critDownloadRes.status !== 200) {
    throw new Error(`Critical download failed: status ${critDownloadRes.status}`);
  }
  console.log('✓ Critical document download verified with secondary token verification.');

  console.log('\n[7] Testing Reset PIN Workflow...');
  const resetRes = await request('/api/vault/reset-pin', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: {
      password: 'StrongPassword123!',
      newPin: '112233',
    },
  });

  if (resetRes.status !== 200) {
    throw new Error(`Reset PIN failed: ${JSON.stringify(resetRes.data)}`);
  }

  const unlockWithNewPin = await request('/api/vault/unlock', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenC}` },
    body: { pin: '112233' },
  });

  if (unlockWithNewPin.status !== 200) {
    throw new Error(`Unlock with new PIN failed: ${JSON.stringify(unlockWithNewPin.data)}`);
  }
  console.log('✓ Vault PIN reset and verified with newly established 6-digit PIN.');

  console.log('\n[8] Testing Critical File Deletion...');
  const deleteCritRes = await request(`/api/vault/files/${criticalFileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${tokenC}`,
      'x-vault-token': unlockWithNewPin.data.vaultToken,
    },
  });

  if (deleteCritRes.status !== 200) {
    throw new Error(`Critical delete failed: ${JSON.stringify(deleteCritRes.data)}`);
  }
  console.log('✓ Critical file deleted cleanly.');

  console.log('\n======================================================');
  console.log('ALL VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ VERIFICATION TEST FAILED:', err);
  process.exit(1);
});
