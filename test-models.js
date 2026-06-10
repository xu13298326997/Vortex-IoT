const fs = require('fs');

async function run() {
  let key = '';
  try {
    const env = fs.readFileSync('.env.local', 'utf8');
    const match = env.match(/(?:GEMINI_API_KEY|GOOGLE_GENERATIVE_AI_API_KEY)\s*=\s*([^\r\n]+)/);
    if (match) {
      key = match[1].trim().replace(/^['"](.*)['"]$/, '$1');
    }
  } catch(e) {}
  
  if (!key) {
    console.error('No key found in .env.local');
    process.exit(1);
  }

  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
    const data = await res.json();
    console.log('Available models:');
    if (data.models) {
      data.models.forEach(m => {
        console.log(`- ${m.name} (Methods: ${m.supportedGenerationMethods.join(', ')})`);
      });
    } else {
      console.log(data);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
