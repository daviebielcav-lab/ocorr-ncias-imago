import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Database } from "@/integrations/supabase/types";

type Occurrence = Database["public"]["Tables"]["occurrences"]["Row"];

interface OccurrenceListProps {
  occurrences: Occurrence[];
  isLoading: boolean;
  selectedId?: string;
  onSelect: (occurrence: Occurrence) => void;
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof Clock }> = {
  aberta: { label: "Aberta", variant: "default", icon: Clock },
  em_analise: { label: "Em análise", variant: "secondary", icon: Loader2 },
  aguardando_confirmacao: { label: "Aguardando confirmação", variant: "outline", icon: AlertCircle },
  finalizada: { label: "Finalizada", variant: "secondary", icon: CheckCircle2 },
};

export function OccurrenceList({ occurrences, isLoading, selectedId, onSelect }: OccurrenceListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (occurrences.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma ocorrência encontrada</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {occurrences.map((occurrence) => {
        const status = statusConfig[occurrence.status] || statusConfig.aberta;
        const StatusIcon = status.icon;
        const isSelected = selectedId === occurrence.id;

        return (
          <Card
            key={occurrence.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md",
              isSelected && "ring-2 ring-primary shadow-md"
            )}
            onClick={() => onSelect(occurrence)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{occurrence.nome}</h3>
                    <Badge variant={status.variant} className="shrink-0">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mb-2">
                    {occurrence.motivo}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {format(new Date(occurrence.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    <span className="px-2 py-0.5 bg-muted rounded">{occurrence.tipo}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
