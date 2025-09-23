// Simple test script to verify the end-to-end query flow with Mistral
 
const { Mistral } = require("@mistralai/mistralai");
const axios = require("axios");
const https = require("https");
 
// --- Environment Setup ---
const config = {
  apiKeys: {
    mistral: 'LnPTmn3hI1k3IrZ6GK96q4CNlp3YWsTX', // set this in your environment
  },
  pyth: {
    endpoint: "https://hermes.pyth.network",
  },
};
 
// --- SSL Fix for Pyth Network ---
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
 
// --- Mistral Client ---
const mistral = new Mistral({
  apiKey: config.apiKeys.mistral,
});
 
// --- Pyth Network Service ---
const PRICE_FEED_IDS = {
  "ETH/USD": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  "BTC/USD": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
};
 
async function getPythPrices(symbols) {
  try {
    const feedIds = symbols.map((symbol) => PRICE_FEED_IDS[symbol]).filter(Boolean);
    if (feedIds.length === 0) return [];
 
    const response = await axios.get(`${config.pyth.endpoint}/api/latest_price_feeds`, {
      params: { ids: feedIds },
      timeout: 10000,
      httpsAgent: httpsAgent,
    });
 
    return response.data.map((feed) => {
      const price = parseInt(feed.price.price) * Math.pow(10, feed.price.expo);
      return {
        symbol: Object.keys(PRICE_FEED_IDS).find((key) => PRICE_FEED_IDS[key] === feed.id),
        price: price.toFixed(2),
        confidence: (parseInt(feed.price.conf) * Math.pow(10, feed.price.expo)).toFixed(2),
        timestamp: new Date(feed.price.publish_time * 1000).toISOString(),
      };
    });
  } catch (error) {
    console.error("❌ Failed to fetch Pyth prices:", error.message);
    return [];
  }
}
 
// --- Main Test Function ---
async function testQueryFlow() {
  const query =
    "What's the real-time price of ETH with confidence intervals, and what does this mean for short-term trading?";
  console.log(`🧪 Testing query: "${query}"\n`);
 
  try {
    // 1. Fetch real-time data from Pyth Network
    console.log("1. Fetching real-time data from Pyth Network...");
    const pythData = await getPythPrices(["ETH/USD"]);
    if (pythData.length === 0) {
      console.error("❌ Could not fetch data from Pyth. Aborting.");
      return;
    }
    console.log("✅ Pyth data received:", JSON.stringify(pythData, null, 2));
 
    // 2. Use Mistral to interpret the data and answer the query
    console.log("\n2. Sending data to Mistral for analysis...");
 
    const systemPrompt = `
You are a DeFi analyst AI. You will receive real-time market data and a user query.
 
Your task is to provide a comprehensive, insightful answer based *only* on the provided data.
 
- Analyze the price, confidence interval, and timestamp.
- Explain what the confidence interval means.
- Provide a brief, neutral analysis for short-term trading.
- Keep your response concise and to the point.
- ALWAYS respond in a JSON format.
`;
 
    const userContent = `
User Query: "${query}"
 
Real-time Data:
${JSON.stringify(pythData, null, 2)}
`;
 
    const completion = await mistral.chat.complete({
      model: "mistral-medium", // you can also try "mistral-small" or "mistral-large-latest"
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 500,
    });
 
    console.log("✅ Mistral response received!");
    let rawContent = completion.choices[0].message.content;
 
    // Remove Markdown code fences if present
    rawContent = rawContent.replace(/```json\n?/g, "").replace(/```/g, "").trim();
 
    let aiResponse;
    try {
      aiResponse = JSON.parse(rawContent);
    } catch (e) {
      console.error("❌ Failed to parse Mistral response as JSON. Raw output:");
      console.error(rawContent);
      return;
    }
 
 
 
    // 3. Display the final result
    console.log("\n--- 📈 FINAL RESULT ---");
    console.log(JSON.stringify(aiResponse, null, 2));
    console.log("\n🎉 End-to-end test successful!");
  } catch (error) {
    console.error("\n❌ An error occurred during the test flow:");
    if (error.response) {
      console.error("   Error details:", error.response.data);
    } else {
      console.error("   Error message:", error.message);
    }
  }
}
 
// --- Run the Test ---
testQueryFlow();
 