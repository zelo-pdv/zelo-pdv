import Link from "next/link";
import { BoxIcon } from "@/components/ui/box-icon";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[85vh] w-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-zinc-100 dark:bg-zinc-800 text-foreground shadow-xs">
        <BoxIcon name="store" className="text-5xl text-foreground" />
        <span className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm">
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
          <Button className="rounded-full px-6 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200">
            <BoxIcon name="home" className="mr-2 text-base text-current" />
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
        Zelo · Gestão de Vendas e Pedidos para Revendedores
      </p>
    </div>
  );
}
