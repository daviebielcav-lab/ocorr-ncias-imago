import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  Phone,
  Calendar,
  FileText,
  X,
  Send,
  CheckCircle2,
  Bot,
  Loader2,
  ExternalLink,
  Download,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type Occurrence = Database["public"]["Tables"]["occurrences"]["Row"];

interface OccurrenceDetailProps {
  occurrence: Occurrence | null;
  onUpdate: (occurrence: Occurrence) => void;
  onClose: () => void;
}

// Webhook URL - using the specified n8n endpoint
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://n8n.imagoradiologia.cloud/webhook-test/ocorrencias";

export function OccurrenceDetail({ occurrence, onUpdate, onClose }: OccurrenceDetailProps) {
  const { toast } = useToast();
  const [adminDescricao, setAdminDescricao] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  // Reset admin description when occurrence changes
  useEffect(() => {
    if (occurrence) {
      setAdminDescricao(occurrence.admin_descricao || "");
      setWebhookError(null);
    }
  }, [occurrence?.id]);

  if (!occurrence) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center py-12 h-full min-h-[400px]">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground text-center">
            Selecione uma ocorrência para ver os detalhes
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build the payload to be sent to n8n webhook
  const buildPayload = () => ({
    occurrence_id: occurrence.id,
    tipo: occurrence.tipo || "",
    motivo: occurrence.motivo || "",
    admin_descricao: adminDescricao || "",
    nome: occurrence.nome || "",
    telefone: occurrence.telefone || "",
    nascimento: occurrence.nascimento || "",
    created_at: occurrence.created_at || "",
  });

  const updateOccurrence = async (updateData: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("admin-occurrences", {
      body: {
        action: "update",
        data: {
          id: occurrence.id,
          ...updateData,
        },
      },
    });

    if (error) throw error;
    return data.occurrence;
  };

  const handleSendToAI = async () => {
    if (!adminDescricao.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Preencha a descrição do administrador antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);
    setWebhookError(null);
    const payload = buildPayload();

    try {
      // First, save the admin description and change status to "em_analise"
      const updatedToAnalysis = await updateOccurrence({
        admin_descricao: adminDescricao,
        status: "em_analise",
      });
      onUpdate(updatedToAnalysis);

      console.log("Sending to n8n webhook:", N8N_WEBHOOK_URL);
      console.log("Payload:", JSON.stringify(payload, null, 2));

      // Call the n8n webhook
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Webhook retornou erro HTTP ${response.status}`);
      }

      // Parse the response
      let aiResponse;
      try {
        aiResponse = await response.json();
      } catch (parseError) {
        throw new Error("Resposta do webhook inválida (não é JSON)");
      }

      // Validate response has required fields
      if (!aiResponse || typeof aiResponse !== "object") {
        throw new Error("Resposta do webhook em formato inválido");
      }

      console.log("AI Response:", aiResponse);

      // Extract fields from response (with defaults for optional fields)
      const {
        ia_resumo = "",
        classificacao = "",
        conclusao = "",
        status = "aguardando_confirmacao",
      } = aiResponse;

      // Update occurrence with AI response
      const updated = await updateOccurrence({
        ia_resumo,
        classificacao,
        conclusao,
        status,
      });

      onUpdate(updated);
      toast({
        title: "Análise concluída",
        description: "A IA processou a ocorrência com sucesso.",
      });

    } catch (error) {
      console.error("Error sending to AI:", error);
      
      // Revert status back if webhook failed
      try {
        const reverted = await updateOccurrence({
          admin_descricao: adminDescricao,
          status: "aberta",
        });
        onUpdate(reverted);
      } catch (revertError) {
        console.error("Error reverting status:", revertError);
      }

      const errorMessage = error instanceof Error 
        ? error.message 
        : "Erro desconhecido ao processar";
      
      setWebhookError(errorMessage);
      toast({
        title: "Erro ao processar pela IA",
        description: "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);

    try {
      // Call the finalize edge function
      const { data, error } = await supabase.functions.invoke("finalize-occurrence", {
        body: { occurrence_id: occurrence.id },
      });

      if (error) throw error;

      onUpdate(data.occurrence);
      toast({
        title: "Ocorrência finalizada",
        description: `Protocolo gerado: ${data.protocolo}`,
      });
    } catch (error) {
      console.error("Error finalizing:", error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a ocorrência.",
        variant: "destructive",
      });
    } finally {
      setIsFinalizing(false);
    }
  };

  // Determine button states
  const isProcessingByAI = occurrence.status === "em_analise" && isSending;
  const canSendToAI = (occurrence.status === "aberta" || occurrence.status === "em_analise") && !isSending;
  const canFinalize = occurrence.status === "aguardando_confirmacao";
  const hasAIResponse = occurrence.ia_resumo || (occurrence as any).classificacao || (occurrence as any).conclusao;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg">Detalhes da Ocorrência</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <Badge 
            variant={occurrence.status === "finalizada" ? "secondary" : "default"}
            className={occurrence.status === "em_analise" ? "animate-pulse" : ""}
          >
            {occurrence.status === "em_analise" && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {occurrence.status.replace(/_/g, " ")}
          </Badge>
        </div>

        {/* Protocol if finalized */}
        {occurrence.protocolo && (
          <div className="p-3 bg-success/10 rounded-lg border border-success/20">
            <p className="text-sm font-medium text-success">
              Protocolo: {occurrence.protocolo}
            </p>
          </div>
        )}

        {/* PDF Download Button */}
        {occurrence.pdf_url && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.open(occurrence.pdf_url!, "_blank")}
          >
            <Download className="mr-2 h-4 w-4" />
            Baixar PDF
          </Button>
        )}

        <Separator />

        {/* Registrant Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Dados do Registrante
          </h4>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground w-24">Nome:</span>
              <span>{occurrence.nome}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              <span>{occurrence.telefone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
              <span>
                {format(new Date(occurrence.nascimento), "dd/MM/yyyy", { locale: ptBR })}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Occurrence Info */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Ocorrência
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Tipo:</span>{" "}
              <Badge variant="outline">{occurrence.tipo}</Badge>
            </div>
            <div>
              <span className="text-muted-foreground block mb-1">Motivo:</span>
              <p className="p-2 bg-muted/50 rounded text-sm">{occurrence.motivo}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Admin Description */}
        <div className="space-y-3">
          <Label htmlFor="admin-desc" className="flex items-center gap-2">
            Descrição do Administrador
          </Label>
          <Textarea
            id="admin-desc"
            placeholder="Adicione observações ou instruções para a análise..."
            value={adminDescricao}
            onChange={(e) => setAdminDescricao(e.target.value)}
            rows={3}
            disabled={occurrence.status === "finalizada" || isSending}
          />
          
          {/* Error Message */}
          {webhookError && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg border border-destructive/20 text-sm">
              <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">Erro ao processar a ocorrência pela IA</p>
                <p className="text-muted-foreground text-xs mt-1">{webhookError}</p>
                <p className="text-muted-foreground text-xs">Tente novamente.</p>
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isSending && (
            <div className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="text-sm font-medium">Processando pela IA...</p>
                <p className="text-xs text-muted-foreground">Aguarde a análise ser concluída</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleSendToAI}
            disabled={!canSendToAI || !adminDescricao.trim()}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar para IA finalizar
              </>
            )}
          </Button>
        </div>

        {/* AI Response Section */}
        {hasAIResponse && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                Análise da IA
              </h4>
              <div className="space-y-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border border-primary/20">
                {(occurrence as any).classificacao && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Classificação</span>
                    <p className="text-sm mt-1">
                      <Badge variant="outline" className="bg-background">
                        {(occurrence as any).classificacao}
                      </Badge>
                    </p>
                  </div>
                )}
                
                {occurrence.ia_resumo && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Resumo</span>
                    <p className="text-sm mt-1 leading-relaxed">{occurrence.ia_resumo}</p>
                  </div>
                )}

                {(occurrence as any).conclusao && (
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conclusão</span>
                    <p className="text-sm mt-1 leading-relaxed">{(occurrence as any).conclusao}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Finalize Button */}
        <Button
          onClick={handleFinalize}
          disabled={!canFinalize || isFinalizing}
          variant={canFinalize ? "default" : "outline"}
          className="w-full"
        >
          {isFinalizing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizando...
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Finalizar chat e gerar PDF
            </>
          )}
        </Button>

        {!canFinalize && occurrence.status !== "finalizada" && (
          <p className="text-xs text-center text-muted-foreground">
            {occurrence.status === "aberta" && "Envie para a IA primeiro para habilitar a finalização"}
            {occurrence.status === "em_analise" && "Aguarde a análise da IA ser concluída"}
          </p>
        )}

        {/* Technical Info */}
        <Separator />
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            <ExternalLink className="h-3 w-3" />
            Informações Técnicas (n8n)
          </h4>
          <div className="p-2 bg-muted/50 rounded text-xs font-mono space-y-1">
            <p>
              <span className="text-muted-foreground">Endpoint:</span>{" "}
              <span className="break-all">{N8N_WEBHOOK_URL}</span>
            </p>
            <details className="cursor-pointer">
              <summary className="text-muted-foreground hover:text-foreground">
                Ver payload de exemplo
              </summary>
              <pre className="mt-2 p-2 bg-background rounded overflow-x-auto text-xs">
                {JSON.stringify(buildPayload(), null, 2)}
              </pre>
            </details>
          </div>
        </div>

        {/* ID */}
        <div className="text-xs text-muted-foreground">
          ID: <code className="font-mono">{occurrence.id}</code>
        </div>
      </CardContent>
    </Card>
  );
}
