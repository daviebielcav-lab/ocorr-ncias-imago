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

// Configurable webhook URL - can be set via environment variable
const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "";

export function OccurrenceDetail({ occurrence, onUpdate, onClose }: OccurrenceDetailProps) {
  const { toast } = useToast();
  const [adminDescricao, setAdminDescricao] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Reset admin description when occurrence changes
  useEffect(() => {
    if (occurrence) {
      setAdminDescricao(occurrence.admin_descricao || "");
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

  // Build the payload that would be sent to n8n
  const buildPayload = () => ({
    occurrence_id: occurrence.id,
    tipo: occurrence.tipo,
    motivo: occurrence.motivo,
    admin_descricao: adminDescricao,
    nome: occurrence.nome,
    telefone: occurrence.telefone,
    nascimento: occurrence.nascimento,
  });

  const updateOccurrence = async (updateData: Partial<Occurrence>) => {
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
    const payload = buildPayload();

    try {
      // First, save the admin description and change status
      await updateOccurrence({
        admin_descricao: adminDescricao,
        status: "em_analise",
      });

      // Try to call the n8n webhook if URL is configured
      let iaResumo = "";
      let newStatus = "aguardando_confirmacao";

      if (N8N_WEBHOOK_URL) {
        try {
          console.log("Calling n8n webhook:", N8N_WEBHOOK_URL);
          console.log("Payload:", JSON.stringify(payload, null, 2));

          const response = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (response.ok) {
            const data = await response.json();
            iaResumo = data.ia_resumo || "Resposta recebida do n8n";
            newStatus = data.status || "aguardando_confirmacao";
          } else {
            console.warn("n8n webhook returned non-ok status:", response.status);
            iaResumo = "Resumo automático (mock) - webhook retornou erro";
          }
        } catch (webhookError) {
          console.warn("n8n webhook call failed:", webhookError);
          iaResumo = "Resumo automático (mock) - webhook indisponível";
        }
      } else {
        // Mock response when no webhook is configured
        console.log("No N8N_WEBHOOK_URL configured, using mock response");
        console.log("Would send payload:", JSON.stringify(payload, null, 2));
        iaResumo = "Resumo automático (mock) - Configure VITE_N8N_WEBHOOK_URL para integrar com n8n";
      }

      // Update with AI response
      const updated = await updateOccurrence({
        ia_resumo: iaResumo,
        status: newStatus,
      });

      onUpdate(updated);
      toast({
        title: "Enviado com sucesso",
        description: "A ocorrência foi enviada para análise da IA.",
      });
    } catch (error) {
      console.error("Error sending to AI:", error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar para análise.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleFinalize = async () => {
    setIsFinalizing(true);

    try {
      // Generate mock protocol
      const protocolo = `PROT-${Date.now().toString(36).toUpperCase()}`;
      const pdfUrl = `mock://pdf/${occurrence.id}.pdf`;

      const updated = await updateOccurrence({
        status: "finalizada",
        protocolo,
        pdf_url: pdfUrl,
      });

      onUpdate(updated);
      toast({
        title: "Ocorrência finalizada",
        description: `Protocolo gerado: ${protocolo}`,
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

  const canSendToAI = occurrence.status === "aberta" || occurrence.status === "em_analise";
  const canFinalize = occurrence.status === "aguardando_confirmacao";

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
          <Badge variant={occurrence.status === "finalizada" ? "secondary" : "default"}>
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
            disabled={occurrence.status === "finalizada"}
          />
          <Button
            onClick={handleSendToAI}
            disabled={!canSendToAI || isSending}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Enviar para IA finalizar
              </>
            )}
          </Button>
        </div>

        {/* AI Response */}
        {occurrence.ia_resumo && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Resposta da IA
              </h4>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <p className="text-sm">{occurrence.ia_resumo}</p>
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
              {N8N_WEBHOOK_URL || "(não configurado - usar VITE_N8N_WEBHOOK_URL)"}
            </p>
            <details className="cursor-pointer">
              <summary className="text-muted-foreground hover:text-foreground">
                Ver payload de exemplo
              </summary>
              <pre className="mt-2 p-2 bg-background rounded overflow-x-auto">
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
