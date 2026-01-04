import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-shared-secret",
};

interface OccurrencePayload {
  nome: string;
  telefone: string;
  data_nascimento: string; // formato: YYYY-MM-DD
  tipo: string;
  motivo: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar shared secret
    const sharedSecret = req.headers.get("x-shared-secret");
    const expectedSecret = Deno.env.get("N8N_SHARED_SECRET");

    if (!sharedSecret || sharedSecret !== expectedSecret) {
      console.error("Invalid or missing shared secret");
      return new Response(
        JSON.stringify({ error: "Unauthorized", message: "Invalid shared secret" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse body
    const payload: OccurrencePayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload));

    // Validação básica
    const { nome, telefone, data_nascimento, tipo, motivo } = payload;

    if (!nome || typeof nome !== "string" || nome.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: "Nome é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!telefone || typeof telefone !== "string" || telefone.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: "Telefone é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!data_nascimento || typeof data_nascimento !== "string") {
      return new Response(
        JSON.stringify({ error: "Validation error", message: "Data de nascimento é obrigatória" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validar formato da data (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data_nascimento)) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: "Data de nascimento deve estar no formato YYYY-MM-DD" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tipo || typeof tipo !== "string" || tipo.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: "Tipo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!motivo || typeof motivo !== "string" || motivo.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Validation error", message: "Motivo é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tipos válidos
    const tiposValidos = ["Administrativa", "Clínica", "Jurídica"];
    const tipoNormalizado = tipo.trim();
    if (!tiposValidos.includes(tipoNormalizado)) {
      return new Response(
        JSON.stringify({ 
          error: "Validation error", 
          message: `Tipo inválido. Valores aceitos: ${tiposValidos.join(", ")}` 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase configuration");
      return new Response(
        JSON.stringify({ error: "Server error", message: "Configuração do servidor incompleta" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Inserir ocorrência
    const { data, error } = await supabase
      .from("occurrences")
      .insert({
        nome: nome.trim(),
        telefone: telefone.trim(),
        nascimento: data_nascimento,
        tipo: tipoNormalizado,
        motivo: motivo.trim(),
        status: "aberta",
      })
      .select("id, protocolo")
      .single();

    if (error) {
      console.error("Database error:", error);
      return new Response(
        JSON.stringify({ error: "Database error", message: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Occurrence created:", data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        occurrence_id: data.id,
        protocolo: data.protocolo,
        message: "Ocorrência criada com sucesso" 
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Server error", message: error instanceof Error ? error.message : "Erro inesperado" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
