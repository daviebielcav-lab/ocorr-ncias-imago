import { useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OccurrenceModal } from "@/components/OccurrenceModal";

const Index = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-semibold text-gradient">
            Ocorrências — Imago
          </h1>
          <nav className="flex items-center gap-2">
            <Button variant="ghost" className="text-foreground">
              Início
            </Button>
            <Link to="/admin">
              <Button variant="ghost" className="text-muted-foreground">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-slide-up">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
            <FileText className="w-10 h-10 text-primary-foreground" />
          </div>

          {/* Title */}
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Sistema de{" "}
              <span className="text-gradient">Ocorrências</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-md mx-auto">
              Registre suas ocorrências de forma simples e rápida.
              Acompanhe o status e receba atualizações.
            </p>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={() => setIsModalOpen(true)}
            className="h-14 px-8 text-lg bg-gradient-primary hover:opacity-90 transition-all shadow-glow hover:shadow-none group"
          >
            Registrar ocorrência
            <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
          </Button>

          {/* Beta Badge */}
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              Beta
            </span>
            <span>Versão de testes</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="container text-center text-sm text-muted-foreground">
          © 2026 Imago. Todos os direitos reservados.
        </div>
      </footer>

      {/* Modal */}
      <OccurrenceModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </div>
  );
};

export default Index;
