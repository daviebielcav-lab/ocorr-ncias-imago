import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, X, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface OccurrenceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormData {
  nome: string;
  telefone: string;
  nascimento: Date | undefined;
  tipo: string;
  motivo: string;
}

interface FormErrors {
  nome?: string;
  telefone?: string;
  nascimento?: string;
  tipo?: string;
  motivo?: string;
}

export function OccurrenceModal({ open, onOpenChange }: OccurrenceModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nome: "",
    telefone: "",
    nascimento: undefined,
    tipo: "",
    motivo: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = "Nome completo é obrigatório";
    } else if (formData.nome.trim().length < 3) {
      newErrors.nome = "Nome deve ter pelo menos 3 caracteres";
    }

    if (!formData.telefone.trim()) {
      newErrors.telefone = "Telefone é obrigatório";
    } else if (formData.telefone.trim().length < 10) {
      newErrors.telefone = "Telefone inválido";
    }

    if (!formData.nascimento) {
      newErrors.nascimento = "Data de nascimento é obrigatória";
    }

    if (!formData.tipo) {
      newErrors.tipo = "Tipo de ocorrência é obrigatório";
    }

    if (!formData.motivo.trim()) {
      newErrors.motivo = "Motivo da ocorrência é obrigatório";
    } else if (formData.motivo.trim().length < 10) {
      newErrors.motivo = "Motivo deve ter pelo menos 10 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // SUBMIT HANDLER - This is where the form is submitted to the database
  // For n8n integration, you can call an edge function here after the insert
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("occurrences")
        .insert({
          nome: formData.nome.trim(),
          telefone: formData.telefone.trim(),
          nascimento: formData.nascimento!.toISOString().split("T")[0],
          tipo: formData.tipo,
          motivo: formData.motivo.trim(),
          status: "aberta",
        })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      setCreatedId(data.id);
      setIsSuccess(true);
      toast({
        title: "Sucesso!",
        description: "Sua ocorrência foi registrada com sucesso.",
      });
    } catch (error) {
      console.error("Error submitting occurrence:", error);
      toast({
        title: "Erro",
        description: "Não foi possível registrar a ocorrência. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      nome: "",
      telefone: "",
      nascimento: undefined,
      tipo: "",
      motivo: "",
    });
    setErrors({});
    setIsSuccess(false);
    setCreatedId(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {isSuccess ? "Ocorrência Registrada" : "Registrar Ocorrência"}
          </DialogTitle>
        </DialogHeader>

        {isSuccess ? (
          <div className="flex flex-col items-center py-8 space-y-6 animate-scale-in">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-medium">
                Ocorrência registrada com sucesso!
              </h3>
              <p className="text-muted-foreground">
                Aguarde análise da sua solicitação.
              </p>
            </div>
            {createdId && (
              <div className="bg-muted rounded-lg p-4 w-full">
                <p className="text-sm text-muted-foreground mb-1">
                  ID interno (para testes):
                </p>
                <code className="text-sm font-mono break-all">{createdId}</code>
              </div>
            )}
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
              <p className="text-sm text-muted-foreground">
                Olá! Vou te ajudar a registrar uma ocorrência. Preencha os campos
                abaixo.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo *</Label>
                <Input
                  id="nome"
                  placeholder="Digite seu nome completo"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  className={cn(errors.nome && "border-destructive")}
                />
                {errors.nome && (
                  <p className="text-sm text-destructive">{errors.nome}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  placeholder="(00) 00000-0000"
                  value={formData.telefone}
                  onChange={(e) =>
                    setFormData({ ...formData, telefone: e.target.value })
                  }
                  className={cn(errors.telefone && "border-destructive")}
                />
                {errors.telefone && (
                  <p className="text-sm text-destructive">{errors.telefone}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Data de nascimento *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.nascimento && "text-muted-foreground",
                        errors.nascimento && "border-destructive"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.nascimento ? (
                        format(formData.nascimento, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.nascimento}
                      onSelect={(date) =>
                        setFormData({ ...formData, nascimento: date })
                      }
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {errors.nascimento && (
                  <p className="text-sm text-destructive">{errors.nascimento}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Tipo de ocorrência *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger
                    className={cn(errors.tipo && "border-destructive")}
                  >
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Administrativa">Administrativa</SelectItem>
                  </SelectContent>
                </Select>
                {errors.tipo && (
                  <p className="text-sm text-destructive">{errors.tipo}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="motivo">Motivo da ocorrência *</Label>
                <Textarea
                  id="motivo"
                  placeholder="Descreva detalhadamente o motivo da sua ocorrência..."
                  value={formData.motivo}
                  onChange={(e) =>
                    setFormData({ ...formData, motivo: e.target.value })
                  }
                  rows={4}
                  className={cn(errors.motivo && "border-destructive")}
                />
                {errors.motivo && (
                  <p className="text-sm text-destructive">{errors.motivo}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-pulse">Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar ocorrência
                  </>
                )}
              </Button>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
