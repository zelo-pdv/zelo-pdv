"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { loginSchema } from "@/lib/validations/auth";
import { authService } from "@/services/auth.service";

import { ModeToggle } from "@/components/layout/mode-toggle";

const REMEMBER_KEY = "revenda-remember-email-v1";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validação Zod no Client
    const validation = loginSchema.safeParse({ email, password });
    if (!validation.success) {
      toast.error(validation.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await authService.login(validation.data);

      // Gerencia o Lembre-me
      if (typeof window !== "undefined") {
        if (remember) {
          window.localStorage.setItem(REMEMBER_KEY, email.trim());
        } else {
          window.localStorage.removeItem(REMEMBER_KEY);
        }
      }

      toast.success(`Bem-vindo(a), seu PDV está pronto!`);
      router.push("/dashboard");
    } catch (error: any) {
      toast.error(error.message || "Erro ao realizar login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-background font-sans overflow-x-hidden">
      {/* Lado Esquerdo - Branding & Imagem (somente Desktop) */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-10 xl:p-12 relative overflow-hidden bg-linear-to-br from-[#1e40af] via-[#1d4ed8] to-[#1e3a8a] dark:from-[#0b192e] dark:via-[#0f2240] dark:to-[#071120] text-white border-r border-blue-900/30 dark:border-blue-950/60">
        {/* Detalhes sutis de iluminação */}
        <div className="absolute inset-0 z-0 opacity-25 dark:opacity-15 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.4),transparent_50%)]" />
        <div className="absolute bottom-0 right-0 z-0 opacity-20 dark:opacity-10 pointer-events-none bg-[radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.4),transparent_60%)] w-150 h-150" />
        
        {/* Topo - Nome Zelo PDV */}
        <div className="relative z-10 flex items-center">
          <span className="text-2xl font-bold tracking-tight text-white">Zelo PDV</span>
        </div>

        {/* Meio - Logo do Zelo em destaque */}
        <div className="relative z-10 my-auto flex items-center justify-center py-6 w-full">
          <div className="relative flex items-center justify-center">
            <Image
              src="/zelo.jpeg"
              alt="Zelo PDV Logo"
              width={260}
              height={260}
              priority
              className="w-56 h-56 xl:w-64 xl:h-64 object-contain rounded-3xl shadow-2xl drop-shadow-2xl border border-white/10"
            />
          </div>
        </div>

        {/* Rodapé do lado esquerdo */}
        <div className="relative z-10 max-w-lg mt-auto">
          <h2 className="text-3xl xl:text-4xl font-bold mb-4 leading-tight text-white tracking-tight">
            Gestão inteligente para o seu negócio decolar
          </h2>
          <p className="text-blue-100/80 text-base xl:text-lg">
            Controle de vendas, estoque e muito mais em uma plataforma simples, rápida e segura.
          </p>
        </div>
      </div>

      {/* Lado Direito - Formulário */}
      <div className="flex flex-1 flex-col justify-center items-center px-6 py-12 lg:px-12 relative overflow-hidden bg-background lg:bg-slate-50/50 dark:lg:bg-background">
        <div className="absolute top-4 right-4 z-20">
          <ModeToggle />
        </div>

        <div className="relative z-10 w-full max-w-100">
          {/* Mobile Logo */}
          <div className="flex lg:hidden flex-col items-center mb-8 gap-3">
            <Image 
              src="/zelo.jpeg" 
              alt="Zelo PDV Logo" 
              width={64} 
              height={64}
              className="rounded-2xl object-contain shadow-sm"
            />
            <span className="text-xl font-bold tracking-tight text-foreground">Zelo PDV</span>
          </div>

          <div className="mb-8 text-left">
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">
              Bem-vindo(a) de volta!
            </h1>
            <p className="text-muted-foreground">
              Acesse sua conta para continuar gerenciando suas vendas.
            </p>
          </div>

          <form
            onSubmit={onSubmit}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="font-semibold text-foreground/90">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="voce@minhaloja.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  className="h-12 px-4 rounded-xl border-border/60 bg-background/50 focus-visible:ring-primary/30 focus-visible:border-primary shadow-sm"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="font-semibold text-foreground/90">Senha</Label>
                  <a href="#" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                    Esqueceu a senha?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    className="h-12 px-4 pr-12 rounded-xl border-border/60 bg-background/50 focus-visible:ring-primary/30 focus-visible:border-primary shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center pt-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                  disabled={loading}
                  className="h-5 w-5 rounded-md border-border/60 group-hover:border-primary data-[state=checked]:bg-primary"
                />
                Lembrar de mim
              </label>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar na conta
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
