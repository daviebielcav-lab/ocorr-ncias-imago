import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { period } = await req.json();

    console.log("Fetching dashboard stats for period:", period);

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Fetch all occurrences in the period
    const { data: occurrences, error } = await supabase
      .from("occurrences")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching occurrences:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = occurrences || [];

    // Calculate stats
    const total = data.length;
    const abertas = data.filter((o) => o.status === "aberta").length;
    const emAnalise = data.filter((o) => o.status === "em_analise").length;
    const aguardandoConfirmacao = data.filter((o) => o.status === "aguardando_confirmacao").length;
    const finalizadas = data.filter((o) => o.status === "finalizada").length;

    // Group by type
    const byType: Record<string, number> = {};
    data.forEach((o) => {
      byType[o.tipo] = (byType[o.tipo] || 0) + 1;
    });

    // Group by status
    const byStatus = {
      aberta: abertas,
      em_analise: emAnalise,
      aguardando_confirmacao: aguardandoConfirmacao,
      finalizada: finalizadas,
    };

    // Group by date (for trend chart)
    const byDate: Record<string, number> = {};
    data.forEach((o) => {
      const date = new Date(o.created_at).toISOString().split("T")[0];
      byDate[date] = (byDate[date] || 0) + 1;
    });

    return new Response(JSON.stringify({
      total,
      abertas,
      emAnalise,
      aguardandoConfirmacao,
      finalizadas,
      byType: Object.entries(byType).map(([name, value]) => ({ name, value })),
      byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
      byDate: Object.entries(byDate)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Dashboard stats error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
