
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Fetch current exchange rate
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();
        const rate = data.rates.LKR;

        if (!rate) {
            throw new Error('Failed to fetch LKR rate');
        }

        // 2. Fetch all plans
        const { data: plans, error: fetchError } = await supabase
            .from('subscription_plans')
            .select('*');

        if (fetchError) throw fetchError;

        const updates = [];

        // 3. Update each plan
        for (const plan of plans) {
            // Skip if price_usd is 0 or null
            if (!plan.price_usd) continue;

            // Calculate new LKR price
            // Round to nearest 100 for cleaner pricing, or 10 if < 1000
            let newPriceLkr = plan.price_usd * rate;

            if (newPriceLkr > 1000) {
                newPriceLkr = Math.ceil(newPriceLkr / 100) * 100;
            } else {
                newPriceLkr = Math.ceil(newPriceLkr / 10) * 10;
            }

            const { error: updateError } = await supabase
                .from('subscription_plans')
                .update({ price_lkr: newPriceLkr })
                .eq('id', plan.id);

            if (updateError) {
                console.error(`Failed to update plan ${plan.name}:`, updateError);
            } else {
                updates.push({ name: plan.name, old_lkr: plan.price_lkr, new_lkr: newPriceLkr, usd: plan.price_usd, rate });
            }
        }

        // Log to Supabase Dashboard
        console.log('Price Updates:', JSON.stringify(updates, null, 2));

        return new Response(
            JSON.stringify({ success: true, rate, updates }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            }
        )
    }
})
