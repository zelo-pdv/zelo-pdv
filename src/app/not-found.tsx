import Link from "next/link";
import { Home, Store } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[85vh] w-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/10 text-primary shadow-xs">
        <Store className="h-12 w-12" />
        <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-sm">
          404
        </span>
      </div>

      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        Página não encontrada
      </h1>

      <p className="mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
        O endereço que você tentou acessar não existe, foi removido ou está temporariamente indisponível.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/dashboard">
          <Button className="rounded-full px-6">
            <Home className="mr-2 h-4 w-4" />
            Ir para o Início
          </Button>
        </Link>
        <Link href="/nova-venda">
          <Button variant="outline" className="rounded-full px-6">
            Nova Venda
          </Button>
        </Link>
      </div>

      <p className="mt-12 text-xs text-muted-foreground">
        Zelo PDV · Sistema de Gestão e Vendas
      </p>
    </div>
  );
}
