import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  role: "bot" | "user";
  content: string;
}

const INITIAL_BOT_MESSAGE = `Olá! Aqui é o bot de ocorrências da Imago 🏥

Por favor, envie em **uma única mensagem** as seguintes informações:

**Nome completo:**
**Telefone:**
**Data de nascimento:** (formato: DD/MM/AAAA)
**Tipo de ocorrência:** (Administrativa)
**Motivo da ocorrência:**

Exemplo:
Nome: João Silva
Telefone: 83999999999
Nascimento: 15/03/1990
Tipo: Administrativa
Motivo: Paciente aguardando resultado de exame há mais de 5 dias`;

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "https://n8n.imagoradiologia.cloud/webhook-test/ocorrencias";

export default function ChatOccurrence() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      role: "bot",
      content: INITIAL_BOT_MESSAGE,
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [occurrenceId, setOccurrenceId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const addMessage = (role: "bot" | "user", content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role,
      content,
    };
    setMessages((prev) => [...prev, newMessage]);
    return newMessage;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isSuccess) return;

    const userMessage = input.trim();
    setInput("");
    addMessage("user", userMessage);
    setIsLoading(true);

    try {
      // Send to n8n webhook - AI extracts the data and returns it
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "chat",
          raw_message: userMessage,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      const data = await response.json();
      console.log("n8n response completo:", JSON.stringify(data, null, 2));

      // Verificar se o n8n retornou success: true (inserção já feita no n8n)
      if (data.success && data.occurrence_id) {
        setOccurrenceId(data.occurrence_id);
        setIsSuccess(true);
        addMessage(
          "bot",
          `✅ Ocorrência registrada com sucesso!\n\n**ID:** ${data.occurrence_id.slice(0, 8).toUpperCase()}\n\nSua solicitação está aguardando análise pela nossa equipe.`
        );
      } 
      // Caso o n8n retorne os dados extraídos para salvar aqui (fallback)
      else if (data.nome || data.telefone || data.nascimento || data.data_nascimento || data.motivo) {
        // Aceitar dados parciais - campos vazios serão null/string vazia
        const nome = data.nome?.trim() || "";
        const telefone = data.telefone?.trim() || "";
        const nascimento = data.nascimento?.trim() || data.data_nascimento?.trim() || "";
        const tipo = data.tipo?.trim() || "Administrativa";
        const motivo = data.motivo?.trim() || "";

        // Precisamos pelo menos do nome OU telefone OU motivo para salvar
        const hasMinimumData = nome || telefone || motivo;

        if (hasMinimumData) {
          // Salvar no Supabase mesmo com dados parciais
          const insertData: any = {
            nome: nome || "Não informado",
            telefone: telefone || "Não informado", 
            nascimento: nascimento || new Date().toISOString().split('T')[0],
            tipo: tipo,
            motivo: motivo || "Não informado",
            status: 'aberta'
          };

          const { data: occurrence, error: dbError } = await supabase
            .from('occurrences')
            .insert(insertData)
            .select()
            .single();

          if (dbError) {
            console.error("Database error:", dbError);
            throw new Error("Erro ao salvar no banco de dados");
          }

          setOccurrenceId(occurrence.id);
          setIsSuccess(true);
          
          // Mostrar quais dados foram capturados e quais estão faltando
          const camposFaltando = [];
          if (!nome) camposFaltando.push("Nome");
          if (!telefone) camposFaltando.push("Telefone");
          if (!nascimento) camposFaltando.push("Data de nascimento");
          if (!motivo) camposFaltando.push("Motivo");

          let mensagem = `✅ Ocorrência registrada!\n\n**ID:** ${occurrence.id.slice(0, 8).toUpperCase()}\n\n**Dados capturados:**`;
          if (nome) mensagem += `\n• Nome: ${nome}`;
          if (telefone) mensagem += `\n• Telefone: ${telefone}`;
          if (nascimento) mensagem += `\n• Nascimento: ${nascimento}`;
          mensagem += `\n• Tipo: ${tipo}`;
          if (motivo) mensagem += `\n• Motivo: ${motivo}`;

          if (camposFaltando.length > 0) {
            mensagem += `\n\n⚠️ **Campos pendentes:** ${camposFaltando.join(", ")}\n\nO administrador poderá completar essas informações.`;
          }

          addMessage("bot", mensagem);
        } else {
          addMessage(
            "bot",
            `⚠️ Não foi possível identificar informações suficientes.\n\nPor favor, informe pelo menos:\n• Nome completo, ou\n• Telefone, ou\n• Motivo da ocorrência`
          );
        }
      } else if (data.error) {
        addMessage(
          "bot",
          `❌ Erro: ${data.error}\n\nPor favor, tente novamente.`
        );
      } else {
        console.log("Resposta inesperada do n8n:", data);
        addMessage(
          "bot",
          `⚠️ Resposta inesperada do sistema. Por favor, tente novamente.`
        );
      }
    } catch (error) {
      console.error("Error:", error);
      addMessage(
        "bot",
        `❌ Erro ao processar sua mensagem. Por favor, tente novamente em alguns instantes.`
      );
      toast.error("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewOccurrence = () => {
    setMessages([
      {
        id: "initial",
        role: "bot",
        content: INITIAL_BOT_MESSAGE,
      },
    ]);
    setIsSuccess(false);
    setOccurrenceId(null);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-semibold">Chat de Ocorrências</h1>
          </div>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container max-w-2xl px-4 py-4 flex flex-col">
        <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
          <div className="space-y-4 pb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="pt-4 border-t">
          {isSuccess ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                <span className="font-medium">Ocorrência registrada!</span>
              </div>
              <Button onClick={handleNewOccurrence} variant="outline">
                Registrar nova ocorrência
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite sua mensagem..."
                disabled={isLoading}
                className="flex-1"
              />
              <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
