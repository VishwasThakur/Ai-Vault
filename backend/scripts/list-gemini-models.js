require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      console.error('List models failed:', res.status, data);
      return;
    }
    console.log('✅ Models available for this key:');
    const modelNames = (data.models || []).map(m => m.name.replace('models/', ''));
    console.log(modelNames.join('\n'));
  } catch (err) {
    console.error('Error fetching models:', err);
  }
}

listModels();
