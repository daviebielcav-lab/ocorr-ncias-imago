import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate protocol number in format IMAGO-YYYYMMDD-XXXX
async function generateProtocol(supabase: any): Promise<string> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const dateKey = `${year}${month}${day}`;

  // Get or create counter for today
  const { data: existing } = await supabase
    .from("protocol_counters")
    .select("counter")
    .eq("date_key", dateKey)
    .maybeSingle();

  let counter: number;

  if (existing) {
    // Increment existing counter
    counter = existing.counter + 1;
    await supabase
      .from("protocol_counters")
      .update({ counter })
      .eq("date_key", dateKey);
  } else {
    // Create new counter for today
    counter = 1;
    await supabase
      .from("protocol_counters")
      .insert({ date_key: dateKey, counter });
  }

  const counterStr = String(counter).padStart(4, "0");
  return `IMAGO-${dateKey}-${counterStr}`;
}

// Format date for display
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Generate PDF content as HTML
function generatePdfHtml(occurrence: any, protocolo: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Helvetica', 'Arial', sans-serif; 
      padding: 40px; 
      color: #1a1a2e;
      line-height: 1.6;
    }
    .header { 
      text-align: center; 
      border-bottom: 3px solid #4f46e5; 
      padding-bottom: 20px; 
      margin-bottom: 30px; 
    }
    .header h1 { 
      color: #4f46e5; 
      font-size: 28px; 
      margin-bottom: 10px; 
    }
    .protocol { 
      font-size: 18px; 
      color: #666; 
      font-weight: bold; 
    }
    .section { 
      margin-bottom: 25px; 
    }
    .section-title { 
      font-size: 14px; 
      color: #4f46e5; 
      text-transform: uppercase; 
      letter-spacing: 1px;
      margin-bottom: 10px; 
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }
    .field { 
      margin-bottom: 8px; 
    }
    .field-label { 
      font-weight: bold; 
      color: #374151; 
    }
    .field-value { 
      color: #1f2937; 
    }
    .content-box { 
      background: #f9fafb; 
      padding: 15px; 
      border-radius: 8px; 
      border: 1px solid #e5e7eb;
      margin-top: 5px;
    }
    .ai-response { 
      background: #eef2ff; 
      border-color: #c7d2fe; 
    }
    .footer { 
      margin-top: 40px; 
      padding-top: 20px; 
      border-top: 1px solid #e5e7eb; 
      text-align: center; 
      font-size: 12px; 
      color: #9ca3af; 
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      background: #4f46e5;
      color: white;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .ai-section {
      background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
      border: 1px solid #c7d2fe;
      border-radius: 12px;
      padding: 20px;
      margin-top: 10px;
    }
    .ai-section h3 {
      color: #4f46e5;
      margin-bottom: 15px;
      font-size: 16px;
    }
    .ai-field {
      margin-bottom: 12px;
    }
    .ai-field-label {
      font-size: 11px;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>OCORRÊNCIA IMAGO</h1>
    <p class="protocol">${protocolo}</p>
    <p style="margin-top: 10px; color: #666;">Gerado em: ${formatDateTime(new Date().toISOString())}</p>
  </div>

  <div class="section">
    <div class="section-title">Dados do Registrante</div>
    <div class="field">
      <span class="field-label">Nome:</span>
      <span class="field-value">${occurrence.nome}</span>
    </div>
    <div class="field">
      <span class="field-label">Telefone:</span>
      <span class="field-value">${occurrence.telefone}</span>
    </div>
    <div class="field">
      <span class="field-label">Data de Nascimento:</span>
      <span class="field-value">${formatDate(occurrence.nascimento)}</span>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalhes da Ocorrência</div>
    <div class="field">
      <span class="field-label">Tipo:</span>
      <span class="badge">${occurrence.tipo}</span>
    </div>
    <div class="field">
      <span class="field-label">Data do Registro:</span>
      <span class="field-value">${formatDateTime(occurrence.created_at)}</span>
    </div>
    <div class="field">
      <span class="field-label">Motivo:</span>
      <div class="content-box">${occurrence.motivo}</div>
    </div>
  </div>

  ${occurrence.admin_descricao ? `
  <div class="section">
    <div class="section-title">Descrição do Administrador</div>
    <div class="content-box">${occurrence.admin_descricao}</div>
  </div>
  ` : ''}

  ${(occurrence.ia_resumo || occurrence.classificacao || occurrence.conclusao) ? `
  <div class="section">
    <div class="section-title">Análise da IA</div>
    <div class="ai-section">
      ${occurrence.classificacao ? `
      <div class="ai-field">
        <div class="ai-field-label">Classificação</div>
        <div><span class="badge">${occurrence.classificacao}</span></div>
      </div>
      ` : ''}
      
      ${occurrence.ia_resumo ? `
      <div class="ai-field">
        <div class="ai-field-label">Resumo</div>
        <div>${occurrence.ia_resumo}</div>
      </div>
      ` : ''}
      
      ${occurrence.conclusao ? `
      <div class="ai-field">
        <div class="ai-field-label">Conclusão</div>
        <div>${occurrence.conclusao}</div>
      </div>
      ` : ''}
    </div>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>Sistema Imago - Gestão de Ocorrências</strong></p>
    <p>Este documento é válido como comprovante de registro e análise de ocorrência.</p>
    <p style="margin-top: 10px;">A decisão final é de responsabilidade do administrador.</p>
  </div>
</body>
</html>
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { occurrence_id } = await req.json();

    if (!occurrence_id) {
      return new Response(JSON.stringify({ error: "occurrence_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Finalizing occurrence:", occurrence_id);

    // Get occurrence data
    const { data: occurrence, error: fetchError } = await supabase
      .from("occurrences")
      .select("*")
      .eq("id", occurrence_id)
      .single();

    if (fetchError || !occurrence) {
      console.error("Error fetching occurrence:", fetchError);
      return new Response(JSON.stringify({ error: "Occurrence not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate unique protocol
    const protocolo = await generateProtocol(supabase);
    console.log("Generated protocol:", protocolo);

    // Generate PDF HTML
    const pdfHtml = generatePdfHtml(occurrence, protocolo);

    // Store as HTML (can be printed/saved as PDF by browser)
    const pdfFileName = `${protocolo}.html`;
    const pdfBlob = new Blob([pdfHtml], { type: "text/html" });

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("occurrence-pdfs")
      .upload(pdfFileName, pdfBlob, {
        contentType: "text/html",
        upsert: true,
      });

    if (uploadError) {
      console.error("Error uploading PDF:", uploadError);
      return new Response(JSON.stringify({ error: "Failed to upload PDF" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("occurrence-pdfs")
      .getPublicUrl(pdfFileName);

    const pdfUrl = urlData.publicUrl;
    console.log("PDF URL:", pdfUrl);

    // Update occurrence with protocol and PDF URL
    const { data: updated, error: updateError } = await supabase
      .from("occurrences")
      .update({
        status: "finalizada",
        protocolo,
        pdf_url: pdfUrl,
      })
      .eq("id", occurrence_id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating occurrence:", updateError);
      return new Response(JSON.stringify({ error: "Failed to update occurrence" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ 
      occurrence: updated,
      protocolo,
      pdf_url: pdfUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Finalize occurrence error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
