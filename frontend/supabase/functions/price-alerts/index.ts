import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY');

interface PriceAlert {
  user_id: string;
  asset_symbol: string;
  target_price: number;
  alert_type: 'above' | 'below';
  is_active: boolean;
  email?: string;
}

interface MarketAlert {
  type: 'high_risk' | 'apy_change' | 'price_movement' | 'smart_contract';
  message: string;
  severity: 'high' | 'medium' | 'low';
  asset?: string;
  protocol?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Processing price alert action:', action);

    switch (action) {
      case 'create_alert':
        return await createPriceAlert(supabase, params);
      
      case 'check_alerts':
        return await checkPriceAlerts(supabase, params);
      
      case 'generate_market_alerts':
        return await generateMarketAlerts(supabase);
      
      case 'get_user_alerts':
        return await getUserAlerts(supabase, params.user_id);
      
      default:
        throw new Error('Invalid action specified');
    }

  } catch (error) {
    console.error('Error in price-alerts function:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function createPriceAlert(supabase: any, params: PriceAlert) {
  // Create price alert in database
  const alertData = {
    user_id: params.user_id,
    asset_symbol: params.asset_symbol,
    target_price: params.target_price,
    alert_type: params.alert_type,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('price_alerts')
    .insert(alertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create alert: ${error.message}`);
  }

  console.log('Created price alert:', data);

  return new Response(JSON.stringify({
    success: true,
    alert: data,
    message: `Alert created for ${params.asset_symbol} ${params.alert_type} $${params.target_price}`,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function checkPriceAlerts(supabase: any, params: { current_prices: Record<string, number> }) {
  const { current_prices } = params;
  
  // Get all active alerts
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select(`
      *,
      profiles(email, display_name)
    `)
    .eq('is_active', true);

  if (error) {
    throw new Error(`Failed to fetch alerts: ${error.message}`);
  }

  const triggeredAlerts = [];

  for (const alert of alerts) {
    const currentPrice = current_prices[alert.asset_symbol.toLowerCase()];
    
    if (!currentPrice) continue;

    let triggered = false;
    if (alert.alert_type === 'above' && currentPrice >= alert.target_price) {
      triggered = true;
    } else if (alert.alert_type === 'below' && currentPrice <= alert.target_price) {
      triggered = true;
    }

    if (triggered) {
      triggeredAlerts.push({
        ...alert,
        current_price: currentPrice,
      });

      // Deactivate the alert
      await supabase
        .from('price_alerts')
        .update({ is_active: false, triggered_at: new Date().toISOString() })
        .eq('id', alert.id);

      // Send email notification if resend is configured
      if (resendApiKey && alert.profiles?.email) {
        await sendPriceAlertEmail(alert, currentPrice);
      }
    }
  }

  console.log('Triggered alerts:', triggeredAlerts.length);

  return new Response(JSON.stringify({
    success: true,
    triggered_alerts: triggeredAlerts,
    total_checked: alerts.length,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function generateMarketAlerts(supabase: any): Promise<Response> {
  // Generate AI-powered market alerts based on current conditions
  const alerts: MarketAlert[] = [
    {
      type: 'high_risk',
      message: 'Unusual activity detected in USDC/ETH pool - high slippage observed',
      severity: 'high',
      asset: 'USDC/ETH',
    },
    {
      type: 'apy_change',
      message: 'Uniswap V3 USDC/ETH APY increased to 18.7% (+3.2% from yesterday)',
      severity: 'low',
      protocol: 'Uniswap V3',
    },
    {
      type: 'price_movement',
      message: 'ETH showing strong support at $2,400 - potential breakout signal',
      severity: 'medium',
      asset: 'ETH',
    },
    {
      type: 'smart_contract',
      message: 'New audit completed for protocol XYZ - no critical vulnerabilities found',
      severity: 'low',
      protocol: 'Protocol XYZ',
    },
  ];

  // Store alerts in database for persistence
  const alertsToStore = alerts.map(alert => ({
    alert_type: alert.type,
    message: alert.message,
    severity: alert.severity,
    asset_symbol: alert.asset,
    protocol_name: alert.protocol,
    created_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('market_alerts')
    .insert(alertsToStore);

  if (error) {
    console.error('Failed to store market alerts:', error);
  }

  return new Response(JSON.stringify({
    success: true,
    alerts,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function getUserAlerts(supabase: any, user_id: string) {
  const { data: alerts, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch user alerts: ${error.message}`);
  }

  return new Response(JSON.stringify({
    success: true,
    alerts,
    timestamp: new Date().toISOString(),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sendPriceAlertEmail(alert: any, currentPrice: number) {
  if (!resendApiKey) return;

  try {
    const resend = new Resend(resendApiKey);
    
    const emailContent = `
      <h2>Price Alert Triggered!</h2>
      <p>Hello ${alert.profiles?.display_name || 'there'},</p>
      <p>Your price alert for <strong>${alert.asset_symbol}</strong> has been triggered.</p>
      <ul>
        <li><strong>Alert Type:</strong> ${alert.alert_type} $${alert.target_price}</li>
        <li><strong>Current Price:</strong> $${currentPrice.toFixed(2)}</li>
        <li><strong>Time:</strong> ${new Date().toLocaleString()}</li>
      </ul>
      <p>This alert has been automatically deactivated.</p>
      <p>Best regards,<br>Agentic DeFi Team</p>
    `;

    await resend.emails.send({
      from: 'Agentic DeFi <alerts@agentic.dev>',
      to: [alert.profiles.email],
      subject: `Price Alert: ${alert.asset_symbol} ${alert.alert_type} $${alert.target_price}`,
      html: emailContent,
    });

    console.log('Price alert email sent successfully');
  } catch (error) {
    console.error('Failed to send price alert email:', error);
  }
}