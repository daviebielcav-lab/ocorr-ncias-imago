import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface DashboardStats {
  total: number;
  abertas: number;
  emAnalise: number;
  aguardandoConfirmacao: number;
  finalizadas: number;
  byType: { name: string; value: number }[];
  byStatus: { name: string; value: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  aberta: "#3b82f6",
  em_analise: "#f59e0b",
  aguardando_confirmacao: "#8b5cf6",
  finalizada: "#10b981",
};

const TYPE_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f97316"];

const STATUS_LABELS: Record<string, string> = {
  aberta: "Aberta",
  em_analise: "Em Análise",
  aguardando_confirmacao: "Aguardando",
  finalizada: "Finalizada",
};

const AdminDashboard = () => {
  const { isAuthenticated, logout } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30d");

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/admin");
    }
  }, [isAuthenticated, navigate]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("dashboard-stats", {
        body: { period },
      });

      if (error) throw error;

      setStats(data);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as estatísticas.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    }
  }, [isAuthenticated, period]);

  const handleLogout = () => {
    logout();
    navigate("/admin");
  };

  if (!isAuthenticated) {
    return null;
  }

  const statCards = stats
    ? [
        {
          title: "Total de Ocorrências",
          value: stats.total,
          icon: FileText,
          color: "text-primary",
          bgColor: "bg-primary/10",
        },
        {
          title: "Abertas",
          value: stats.abertas,
          icon: Clock,
          color: "text-blue-500",
          bgColor: "bg-blue-500/10",
        },
        {
          title: "Em Análise",
          value: stats.emAnalise,
          icon: AlertCircle,
          color: "text-amber-500",
          bgColor: "bg-amber-500/10",
        },
        {
          title: "Finalizadas",
          value: stats.finalizadas,
          icon: CheckCircle2,
          color: "text-emerald-500",
          bgColor: "bg-emerald-500/10",
        },
      ]
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/panel")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-xl font-semibold text-gradient">Dashboard</h1>
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              Beta
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchStats}>
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
      <main className="flex-1 container py-6 space-y-6">
        {/* Period Filter */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Visão Geral
          </h2>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {statCards.map((card) => (
                <Card key={card.title} className="animate-fade-in">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                      <card.icon className={`h-4 w-4 ${card.color}`} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{card.value}</div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Charts */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* By Type Chart */}
              <Card className="animate-slide-up">
                <CardHeader>
                  <CardTitle className="text-lg">Ocorrências por Tipo</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.byType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.byType}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.byType.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={TYPE_COLORS[index % TYPE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* By Status Chart */}
              <Card className="animate-slide-up" style={{ animationDelay: "0.1s" }}>
                <CardHeader>
                  <CardTitle className="text-lg">Ocorrências por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats.byStatus.some((s) => s.value > 0) ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={stats.byStatus.filter((s) => s.value > 0)}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${STATUS_LABELS[name] || name} (${(percent * 100).toFixed(0)}%)`
                          }
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {stats.byStatus
                            .filter((s) => s.value > 0)
                            .map((entry) => (
                              <Cell
                                key={`cell-${entry.name}`}
                                fill={STATUS_COLORS[entry.name] || "#888"}
                              />
                            ))}
                        </Pie>
                        <Tooltip
                          formatter={(value, name) => [
                            value,
                            STATUS_LABELS[name as string] || name,
                          ]}
                        />
                        <Legend
                          formatter={(value) => STATUS_LABELS[value] || value}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Erro ao carregar dados
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
