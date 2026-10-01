require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testKey() {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('Testing Gemini API Key:');
  console.log('Key prefix:', apiKey ? apiKey.slice(0, 8) + '...' : '(none)');
  console.log('Key length:', apiKey ? apiKey.length : 0);
  console.log('Standard AI Studio Key pattern (starts with AIzaSy...):', apiKey ? apiKey.startsWith('AIzaSy') : false);

  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY is not set in .env');
    process.exit(1);
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim());

  // Test with gemini-1.5-flash
  console.log('\n1. Testing with model "gemini-1.5-flash"...');
  try {
    const model15 = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result15 = await model15.generateContent('Say hello in 3 words');
    const response15 = await result15.response;
    console.log('✅ Success with gemini-1.5-flash!');
    console.log('Response text:', response15.text().trim());
  } catch (err15) {
    console.error('❌ Failed with gemini-1.5-flash:');
    console.error('Error message:', err15.message);
    if (err15.status) console.error('Status code:', err15.status);
    if (err15.errorDetails) console.error('Error details:', JSON.stringify(err15.errorDetails, null, 2));
  }

  // Test with gemini-2.0-flash
  console.log('\n2. Testing with model "gemini-2.0-flash"...');
  try {
    const model20 = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result20 = await model20.generateContent('Say hello in 3 words');
    const response20 = await result20.response;
    console.log('✅ Success with gemini-2.0-flash!');
    console.log('Response text:', response20.text().trim());
  } catch (err20) {
    console.error('❌ Failed with gemini-2.0-flash:');
    console.error('Error message:', err20.message);
    if (err20.status) console.error('Status code:', err20.status);
    if (err20.errorDetails) console.error('Error details:', JSON.stringify(err20.errorDetails, null, 2));
  }
}

testKey();
