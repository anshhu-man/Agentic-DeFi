import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, user_id, portfolio_data } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user's portfolio data if user_id is provided
    let userPortfolio = portfolio_data;
    if (user_id && !portfolio_data) {
      const [holdingsResult, positionsResult, profileResult] = await Promise.all([
        supabase.from('user_holdings').select('*').eq('user_id', user_id),
        supabase.from('defi_positions').select('*').eq('user_id', user_id),
        supabase.from('profiles').select('*').eq('user_id', user_id).single(),
      ]);

      userPortfolio = {
        holdings: holdingsResult.data || [],
        defi_positions: positionsResult.data || [],
        profile: profileResult.data,
      };
    }

    // Create system prompt based on available data
    const systemPrompt = `You are an AI-powered DeFi portfolio assistant. You help users understand their cryptocurrency investments, DeFi positions, and market opportunities.

${userPortfolio ? `
User's Portfolio Data:
- Holdings: ${JSON.stringify(userPortfolio.holdings, null, 2)}
- DeFi Positions: ${JSON.stringify(userPortfolio.defi_positions, null, 2)}
- Profile: ${JSON.stringify(userPortfolio.profile, null, 2)}
` : 'No user portfolio data available - provide general DeFi advice.'}

Instructions:
1. Provide helpful, accurate information about DeFi and cryptocurrency
2. If portfolio data is available, give personalized advice
3. Always consider risk management and diversification
4. Suggest specific actions when appropriate (rebalancing, new opportunities, etc.)
5. Keep responses concise but informative
6. If asked to create charts, provide sample data that would be useful for visualization
7. Focus on actionable insights

When generating charts or data visualizations, provide structured data that can be used to create:
- Line charts (for trends over time)
- Bar charts (for comparisons)
- Pie charts (for allocation/distribution)
- Area charts (for portfolio performance)

Current market context: Focus on multi-chain DeFi opportunities across Ethereum, Polygon, and Rootstock.`;

    console.log('Processing AI chat request for user:', user_id);

    // Determine if the user is asking for chart generation
    const isChartRequest = message.toLowerCase().includes('chart') || 
                          message.toLowerCase().includes('graph') || 
                          message.toLowerCase().includes('visualize') ||
                          message.toLowerCase().includes('show');

    let chartData = null;
    let chartType = null;

    // Generate chart data if requested
    if (isChartRequest) {
      const chartResult = await generateChartData(message, userPortfolio);
      chartData = chartResult.data;
      chartType = chartResult.type;
    }

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Generated AI response successfully');

    return new Response(JSON.stringify({
      success: true,
      response: aiResponse,
      chartData,
      chartType,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-portfolio-chat function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      response: "I'm experiencing some technical difficulties. Please try again in a moment.",
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateChartData(message: string, portfolio: any) {
  const messageLower = message.toLowerCase();
  
  if (messageLower.includes('portfolio') && messageLower.includes('over time')) {
    // Portfolio performance over time
    const data = [];
    const startValue = 10000;
    for (let i = 0; i < 6; i++) {
      const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'][i];
      const growth = 1 + (Math.random() * 0.4 - 0.1); // -10% to +30% monthly variation
      const value = Math.round(startValue * Math.pow(growth, i + 1));
      data.push({ month, portfolio: value });
    }
    return { data, type: 'area' };
  }
  
  if (messageLower.includes('allocation') || messageLower.includes('distribution')) {
    // Portfolio allocation pie chart
    if (portfolio?.holdings?.length > 0) {
      const data = portfolio.holdings.map((holding: any) => ({
        name: holding.asset_symbol,
        value: holding.current_value_usd,
        fill: getRandomColor(),
      }));
      return { data, type: 'pie' };
    } else {
      return {
        data: [
          { name: 'ETH', value: 45, fill: 'hsl(var(--primary))' },
          { name: 'BTC', value: 30, fill: 'hsl(var(--accent))' },
          { name: 'USDC', value: 25, fill: 'hsl(var(--muted))' },
        ],
        type: 'pie'
      };
    }
  }
  
  if (messageLower.includes('compare') || messageLower.includes('bar')) {
    // Asset comparison bar chart
    const assets = ['ETH', 'BTC', 'USDC', 'UNI', 'RBTC'];
    const data = assets.map(asset => ({
      category: asset,
      value: Math.floor(Math.random() * 100) + 20,
    }));
    return { data, type: 'bar' };
  }
  
  // Default line chart
  const data = [];
  for (let i = 0; i < 7; i++) {
    data.push({
      time: `Day ${i + 1}`,
      value: Math.floor(Math.random() * 1000) + 500,
    });
  }
  return { data, type: 'line' };
}

function getRandomColor(): string {
  const colors = [
    'hsl(var(--primary))',
    'hsl(var(--accent))',
    'hsl(var(--muted))',
    'hsl(249 100% 70%)',
    'hsl(122 39% 49%)',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}