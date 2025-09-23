// scripts/test-mistral-pyth-fixed.js
require('dotenv').config();
const { Mistral } = require('@mistralai/mistralai');
const axios = require('axios');

const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
if (!MISTRAL_API_KEY) {
  console.error('Missing MISTRAL_API_KEY in environment (.env). Aborting.');
  process.exit(1);
}

const config = {
  apiKeys: {
    mistral: MISTRAL_API_KEY,
  },
  pyth: {
    endpoint: 'https://hermes.pyth.network',
  },
};

const PRICE_FEED_IDS = {
  'ETH/USD': '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  'BTC/USD': '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
};

async function getPythPrices(symbols) {
  try {
    const feedIds = symbols.map((s) => PRICE_FEED_IDS[s]).filter(Boolean);
    if (!feedIds.length) return [];

    const response = await axios.get(
      `${config.pyth.endpoint}/api/latest_price_feeds`,
      {
        params: { ids: feedIds },
        timeout: 10000,
      }
    );

    return response.data.map((feed) => {
      const p = feed.price;
      const price = Number(p.price) * Math.pow(10, p.expo);
      const conf = Number(p.conf) * Math.pow(10, p.expo);

      return {
        symbol: Object.keys(PRICE_FEED_IDS).find((k) => PRICE_FEED_IDS[k] === feed.id),
        price: Number.isFinite(price) ? price.toFixed(6) : null,
        confidence: Number.isFinite(conf) ? conf.toFixed(6) : null,
        timestamp: new Date(p.publish_time * 1000).toISOString(),
      };
    });
  } catch (e) {
    console.error('Failed to fetch Pyth prices:', e.message);
    return [];
  }
}

async function testQueryFlow() {
  const query =
    "What's the real-time price of ETH with confidence intervals, and what does this mean for short-term trading?";
  console.log(`Testing query: "${query}"\n`);

  try {
    // 1) Pyth data
    console.log('1) Fetching real-time data from Pyth Network...');
    const pythData = await getPythPrices(['ETH/USD']);
    if (!pythData.length) {
      console.error('Could not fetch data from Pyth. Aborting.');
      return;
    }
    console.log('Pyth data:', JSON.stringify(pythData, null, 2));

    // 2) Mistral analysis
    console.log('\n2) Sending data to Mistral for analysis...');
    const mistral = new Mistral({ apiKey: config.apiKeys.mistral });

    const systemPrompt = [
      'You are a DeFi analyst AI. You will receive real-time market data and a user query.',
      'Your task is to provide a comprehensive, insightful answer based only on the provided data.',
      '- Analyze the price, confidence interval, and timestamp.',
      '- Explain what the confidence interval means.',
      '- Provide a brief, neutral analysis for short-term trading.',
      '- Keep your response concise and to the point.',
      '- ALWAYS respond in a JSON format.'
    ].join('\n');

    const userContent = `User Query: "${query}"\nReal-time Data: ${JSON.stringify(pythData, null, 2)}`;

    const completion = await mistral.chat.complete({
      model: 'mistral-medium',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    let raw = completion.choices?.[0]?.message?.content ?? '';
    // Strip Markdown code fences if present
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    let ai;
    try {
      ai = JSON.parse(raw);
    } catch {
      console.error('Failed to parse Mistral response as JSON. Raw output:');
      console.error(raw);
      return;
    }

    // 3) Show result
    console.log('\n--- FINAL RESULT ---');
    console.log(JSON.stringify(ai, null, 2));
    console.log('\nEnd-to-end test successful!');
  } catch (err) {
    console.error('\nAn error occurred during the test flow:');
    if (err?.response?.data) {
      console.error('Error details:', err.response.data);
    } else {
      console.error('Error message:', err.message);
    }
  }
}

testQueryFlow();
