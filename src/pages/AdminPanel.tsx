import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, RefreshCw, Filter, Search, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdmin } from "@/contexts/AdminContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { OccurrenceList } from "@/components/admin/OccurrenceList";
import { OccurrenceDetail } from "@/components/admin/OccurrenceDetail";
import type { Database } from "@/integrations/supabase/types";

type Occurrence = Database["public"]["Tables"]["occurrences"]["Row"];

const AdminPanel = () => {
  const { isAuthenticated, logout } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin");
    }
  }, [isAuthenticated, navigate]);

  const fetchOccurrences = async () => {
    setIsLoading(true);
    try {
      // Use the edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke("admin-occurrences", {
        body: {
          action: "list",
          data: {
            status: statusFilter,
            tipo: typeFilter,
          },
        },
      });

      if (error) {
        console.error("Error fetching occurrences:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar as ocorrências.",
          variant: "destructive",
        });
        return;
      }

      setOccurrences(data.occurrences || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao conectar com o servidor.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOccurrences();
    }
  }, [isAuthenticated, statusFilter, typeFilter]);

  const handleLogout = () => {
    logout();
    navigate("/admin");
  };

  const handleOccurrenceUpdate = (updated: Occurrence) => {
    setOccurrences((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o))
    );
    setSelectedOccurrence(updated);
  };

  const filteredOccurrences = occurrences.filter((o) => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      o.nome.toLowerCase().includes(search) ||
      o.telefone.includes(search) ||
      o.motivo.toLowerCase().includes(search)
    );
  });

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gradient">
              Painel Admin
            </h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/admin/dashboard">
              <Button variant="outline" size="sm">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchOccurrences}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 container py-6">
        <div className="grid lg:grid-cols-[1fr,400px] gap-6">
          {/* Left side - List */}
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                <span>Filtros:</span>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="aberta">Aberta</SelectItem>
                  <SelectItem value="em_analise">Em análise</SelectItem>
                  <SelectItem value="aguardando_confirmacao">Aguardando confirmação</SelectItem>
                  <SelectItem value="finalizada">Finalizada</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="Administrativa">Administrativa</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, telefone ou motivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* List */}
            <OccurrenceList
              occurrences={filteredOccurrences}
              isLoading={isLoading}
              selectedId={selectedOccurrence?.id}
              onSelect={setSelectedOccurrence}
            />
          </div>

          {/* Right side - Detail */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <OccurrenceDetail
              occurrence={selectedOccurrence}
              onUpdate={handleOccurrenceUpdate}
              onClose={() => setSelectedOccurrence(null)}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
