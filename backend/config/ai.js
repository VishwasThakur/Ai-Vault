const { GoogleGenerativeAI } = require('@google/generative-ai');

let keyPool = [];
let lastWorkingKeyIndex = 0;
let resolvedWorkingModel = null;

const CANDIDATE_MODELS = [
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-1.5-flash',
];

const getNextPacificMidnight = () => {
  const now = new Date();
  const ptString = now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
  const ptDate = new Date(ptString);
  const nextMidnightPT = new Date(ptDate);
  nextMidnightPT.setDate(nextMidnightPT.getDate() + 1);
  nextMidnightPT.setHours(0, 0, 0, 0);
  const msUntilMidnight = nextMidnightPT.getTime() - ptDate.getTime();
  if (msUntilMidnight > 0) {
    return new Date(now.getTime() + msUntilMidnight);
  }
  return new Date(now.getTime() + 24 * 3600 * 1000);
};

const initGemini = () => {
  const rawConfig = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || '';
  const entries = rawConfig
    .split(',')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);

  const uniqueKeys = Array.from(new Set(entries));

  keyPool = uniqueKeys.map((key, i) => ({
    index: i + 1,
    key,
    status: 'active',
    exhaustedAt: null,
    resetAt: null,
    failureReason: '',
  }));

  lastWorkingKeyIndex = 0;
  console.log(`[Gemini AI] Loaded ${keyPool.length} API key(s) for rotation.`);
  return keyPool.length > 0;
};

initGemini();

const refreshExhaustedKeys = () => {
  const now = Date.now();
  keyPool.forEach((k) => {
    if (k.status === 'exhausted' && k.resetAt && now >= k.resetAt.getTime()) {
      k.status = 'active';
      k.exhaustedAt = null;
      k.resetAt = null;
      k.failureReason = '';
      console.log(`[Gemini AI] Key ${k.index} of ${keyPool.length} quota reset. Reactivated.`);
    }
  });
};

const isAuthOrPermissionError = (err) => {
  const msg = (err && err.message) || '';
  return (
    msg.includes('API_KEY_INVALID') ||
    msg.includes('API key not valid') ||
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('401') ||
    msg.includes('403') ||
    (msg.includes('400') && msg.includes('API key'))
  );
};

const isQuotaError = (err) => {
  const msg = (err && err.message) || '';
  return (
    msg.includes('429') ||
    msg.includes('Too Many Requests') ||
    msg.includes('Quota exceeded') ||
    msg.includes('quota') ||
    msg.includes('ResourceExhausted')
  );
};

const parseRetryDelay = (msg) => {
  const text = msg || '';
  const match =
    text.match(/retry in\s*([0-9.]+)\s*s/i) ||
    text.match(/retryDelay["']?\s*:\s*["']?([0-9.]+)\s*s?/i);
  return match ? parseFloat(match[1]) : 0;
};

const callModelWithFallback = async (genAIClient, prompt) => {
  const modelsToTry = resolvedWorkingModel
    ? [resolvedWorkingModel, ...CANDIDATE_MODELS.filter((m) => m !== resolvedWorkingModel)]
    : CANDIDATE_MODELS;

  let lastModelError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAIClient.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      if (!resolvedWorkingModel || resolvedWorkingModel !== modelName) {
        resolvedWorkingModel = modelName;
        console.log(`[Gemini AI] Model ${modelName} worked.`);
      }

      return text;
    } catch (err) {
      const errMsg = err && err.message ? err.message : '';
      const isModelNotFound =
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('unsupported model') ||
        errMsg.includes('is not supported');

      if (isModelNotFound) {
        lastModelError = err;
        continue;
      }
      throw err;
    }
  }

  throw lastModelError || new Error('No candidate Gemini model succeeded');
};

const executeWithKeyRotation = async (prompt) => {
  if (keyPool.length === 0) {
    initGemini();
  }

  if (keyPool.length === 0) {
    throw new Error('AI is temporarily unavailable, please try again later.');
  }

  refreshExhaustedKeys();

  const total = keyPool.length;
  const orderedIndices = [];
  for (let step = 0; step < total; step++) {
    orderedIndices.push((lastWorkingKeyIndex + step) % total);
  }

  const activeKeyIndices = orderedIndices.filter((idx) => keyPool[idx].status === 'active');

  if (activeKeyIndices.length === 0) {
    throw new Error('AI is temporarily unavailable, please try again later.');
  }

  for (const idx of activeKeyIndices) {
    const keyObj = keyPool[idx];
    const genAIClient = new GoogleGenerativeAI(keyObj.key);

    try {
      const resultText = await callModelWithFallback(genAIClient, prompt);
      lastWorkingKeyIndex = idx;
      console.log(`Gemini request served by key ${keyObj.index} of ${total}`);
      return resultText;
    } catch (err) {
      const errMsg = (err && err.message) || '';

      if (isAuthOrPermissionError(err)) {
        keyObj.status = 'invalid';
        keyObj.failureReason = 'Invalid or unauthorized API key';
        console.log(`[Gemini AI] Key ${keyObj.index} of ${total} returned authentication error. Marked invalid.`);
        continue;
      }

      if (isQuotaError(err)) {
        const isDaily = /per[-_]?day|daily|perday/i.test(errMsg);
        const retryDelaySec = parseRetryDelay(errMsg);

        if (!isDaily && retryDelaySec > 0 && retryDelaySec <= 15) {
          console.log(`[Gemini AI] Key ${keyObj.index} hit short rate limit. Waiting ${retryDelaySec}s before retrying...`);
          await new Promise((resolve) => setTimeout(resolve, Math.ceil(retryDelaySec * 1000)));

          try {
            const retryResult = await callModelWithFallback(genAIClient, prompt);
            lastWorkingKeyIndex = idx;
            console.log(`Gemini request served by key ${keyObj.index} of ${total}`);
            return retryResult;
          } catch (retryErr) {
            if (isAuthOrPermissionError(retryErr)) {
              keyObj.status = 'invalid';
              keyObj.failureReason = 'Invalid or unauthorized API key';
              continue;
            }
          }
        }

        keyObj.status = 'exhausted';
        keyObj.exhaustedAt = new Date();
        keyObj.resetAt = isDaily
          ? getNextPacificMidnight()
          : new Date(Date.now() + Math.max(retryDelaySec * 1000, 60000));
        keyObj.failureReason = isDaily ? 'Daily quota exceeded' : 'Rate limit exceeded';
        console.log(`[Gemini AI] Key ${keyObj.index} of ${total} marked exhausted until ${keyObj.resetAt.toISOString()}.`);
        continue;
      }

      throw err;
    }
  }

  throw new Error('AI is temporarily unavailable, please try again later.');
};

const summarizeDocument = async (documentText, fileName) => {
  if (!documentText || documentText.trim().length === 0) {
    return 'The selected document does not contain readable text to summarize.';
  }

  const prompt = `You are VaultAI's executive document intelligence assistant.
Summarize the following document in a concise, well-structured way. Focus on key points, main topics, and important details. Keep the summary proportional to the document's length.

Document Title: ${fileName}

--- Document Content ---
${documentText}
--- End of Document ---`;

  return await executeWithKeyRotation(prompt);
};

const askDocumentQuestion = async (documentText, fileName, question) => {
  if (!documentText || documentText.trim().length === 0) {
    return 'This file contains no extractable text. VaultAI cannot answer questions on files without readable text.';
  }

  if (!question || question.trim().length === 0) {
    return 'Please enter a valid question about the document.';
  }

  const prompt = `You are VaultAI's document intelligence assistant.
Answer the user's question using ONLY the information in the following document. If the document does not contain enough information to answer the question, say so clearly instead of guessing.

Document Title: ${fileName}

User Question: ${question}

--- Document Content ---
${documentText}
--- End of Document ---

Provide a direct, helpful, and grounded answer:`;

  return await executeWithKeyRotation(prompt);
};

const extractDocumentKeywords = async (documentText, fileName) => {
  if (!documentText || documentText.trim().length === 0) {
    return [];
  }

  const prompt = `Extract 5 to 8 important keywords or key phrases from the following document.
Document Title: ${fileName}

--- Document Content ---
${documentText.slice(0, 4000)}
--- End of Document ---

Respond ONLY with a comma-separated list of 5 to 8 keywords (example: Machine Learning, Neural Networks, Python, Classification). Do not include numbering, bullets, or extra text.`;

  try {
    const raw = await executeWithKeyRotation(prompt);
    if (!raw) return [];
    return raw
      .split(',')
      .map((item) => item.replace(/^[0-9-.*•\s]+/, '').replace(/[\n\r]+/g, ' ').trim())
      .filter((item) => item.length > 0 && item.length < 50)
      .slice(0, 8);
  } catch (error) {
    return [];
  }
};

const suggestDocumentCategory = async (documentText, fileName, availableFolders) => {
  if (!documentText || documentText.trim().length === 0 || !availableFolders || availableFolders.length === 0) {
    return null;
  }

  const folderNames = availableFolders.map((f) => f.name).join(', ');
  const prompt = `Given the document below and the following available categories: [${folderNames}], identify the single best matching category.
Document Title: ${fileName}

--- Document Content ---
${documentText.slice(0, 4000)}
--- End of Document ---

Respond ONLY with the exact matching category name from [${folderNames}]. Do not provide explanations.`;

  try {
    const raw = await executeWithKeyRotation(prompt);
    if (!raw) return null;
    const cleanName = raw.trim().replace(/^["']|["']$/g, '').trim();
    const matched = availableFolders.find(
      (f) => f.name.toLowerCase() === cleanName.toLowerCase()
    );
    return matched ? { folderId: matched._id, folderName: matched.name } : null;
  } catch (error) {
    return null;
  }
};

const getKeyPoolStatus = () => {
  return keyPool.map((k) => ({
    index: k.index,
    status: k.status,
    exhaustedAt: k.exhaustedAt,
    resetAt: k.resetAt,
    failureReason: k.failureReason,
  }));
};

const setKeyStatus = (index, status, resetAt = null) => {
  const target = keyPool.find((k) => k.index === index);
  if (target) {
    target.status = status;
    if (status === 'exhausted') {
      target.exhaustedAt = new Date();
      target.resetAt = resetAt || getNextPacificMidnight();
    } else if (status === 'active') {
      target.exhaustedAt = null;
      target.resetAt = null;
      target.failureReason = '';
    }
  }
};

const testSingleKeyDirect = async (apiKey) => {
  if (!apiKey || apiKey.trim().length === 0) return 'invalid';
  const client = new GoogleGenerativeAI(apiKey.trim());

  const modelsToTry = resolvedWorkingModel
    ? [resolvedWorkingModel, ...CANDIDATE_MODELS.filter((m) => m !== resolvedWorkingModel)]
    : CANDIDATE_MODELS;

  for (const modelName of modelsToTry) {
    try {
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Respond with OK');
      const response = await result.response;
      if (response && response.text()) {
        if (!resolvedWorkingModel) {
          resolvedWorkingModel = modelName;
          console.log(`[Gemini AI] Model ${modelName} worked.`);
        }
        return 'OK';
      }
    } catch (err) {
      if (isAuthOrPermissionError(err)) {
        return 'invalid';
      }
      if (isQuotaError(err)) {
        return 'quota exhausted';
      }
      const errMsg = (err && err.message) || '';
      if (
        errMsg.includes('404') ||
        errMsg.includes('not found') ||
        errMsg.includes('no longer available') ||
        errMsg.includes('unsupported model') ||
        errMsg.includes('is not supported')
      ) {
        continue;
      }
      return 'invalid';
    }
  }

  return 'invalid';
};

const getLastWorkingKeyIndex = () => lastWorkingKeyIndex;

module.exports = {
  initGemini,
  summarizeDocument,
  askDocumentQuestion,
  extractDocumentKeywords,
  suggestDocumentCategory,
  getKeyPoolStatus,
  setKeyStatus,
  testSingleKeyDirect,
  getLastWorkingKeyIndex,
};
