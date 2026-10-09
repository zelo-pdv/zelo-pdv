# Zelo

> **Gestão de Vendas e Pedidos para Revendedores**  
> *Seu caderno de vendas digital com catálogo de campanhas integrado.*

O **Zelo** é um assistente de bolso inteligente e offline-first desenvolvido especialmente para revendedoras e consultores autônomos gerenciarem encomendas, clientes e cobranças sem complicação.

Diferente de um PDV tradicional de varejo — que foca em caixas físicos, cupons fiscais e vendas de balcão imediata —, o Zelo foi desenhado para a dinâmica real da venda direta: **anotação de encomendas**, **consolidação de pedidos de campanha**, **controle de entregas** e **gestão de recebimentos/cobrança** (fiado, parcelado, carnê e Pix).

---

## 🎯 Por que o Zelo?

1. **Ciclo Completo da Venda Direta:** Coleta o pedido dos clientes (encomendas), consolida as peças para o fechamento de ciclo da marca (Avon, Natura, Boticário, DeMillus, etc.) e facilita a entrega e cobrança.
2. **Catálogo Integrado de Campanhas:** Busca inteligente direto pelos códigos da revista/catálogo, eliminando o trabalho braçal de cadastrar item por item.
3. **Caderno Digital Inteligente:** Substitui o caderno de papel por uma ferramenta prática, ágil, com controle de saldo devedor e histórico por cliente.
4. **Offline-First & Responsivo:** Funciona perfeitamente em smartphones e desktops, garantindo que o revendedor nunca perca uma anotação, mesmo sem conexão estável.

---

## 🚀 Tecnologias

- **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** SQLite (desenvolvimento) / PostgreSQL (produção) via [Prisma ORM](https://www.prisma.io/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) com componentes shadcn/ui
- **Autenticação & Segurança:** Autenticação via JWT cookies com isolamento de Multi-Tenancy nativo via Middleware (`proxy.ts`).
- **PWA & Offline:** Service Worker e Web Manifest para instalação como aplicativo mobile.
- **Testes:** [Vitest](https://vitest.dev/) para suíte de testes de regressão E2E.

---

## 🔒 Arquitetura de Segurança & Multi-Tenancy

O Zelo conta com uma camada rigorosa de proteção e isolamento:

1. **Multi-Tenancy Restrito:** Cada conta/loja possui seus próprios clientes, pedidos e produtos isolados por `lojaId`.
2. **RBAC (Role-Based Access Control):** Níveis de permissão configuráveis (`ADMIN`, `Gerente`, `Vendedor`) com proteção contra auto-exclusão do proprietário.
3. **Validação E2E no Proxy (`proxy.ts`):** Intercepção de requisições garantindo autenticidade e validade da sessão antes de atingir as rotas protegidas.
4. **Resiliência a Concorrência:** Fechamento atômico de pedidos com locks otimistas e controle seguro de numeração de recibos.

---

## ⚙️ Instalação e Execução

### Pré-requisitos
- Node.js >= 18
- [pnpm](https://pnpm.io/) instalado

### Passos

1. Clone o repositório e instale as dependências:
   ```bash
   git clone <repo>
   cd zelo
   pnpm install
   ```

2. Configure as variáveis de ambiente baseadas no `.env.example`:
   ```bash
   cp .env.example .env
   # Preencha a DATABASE_URL e a JWT_SECRET no .env
   ```

3. Execute as migrações e seed do banco de dados:
   ```bash
   pnpm prisma migrate dev
   pnpm prisma db seed
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

5. Acesse o sistema em [http://localhost:3000](http://localhost:3000).

---

## 🧪 Testes de Regressão E2E

Para executar a suíte de testes:

```bash
pnpm test:e2e
```

A suíte cobre:
- `auth.test.ts`: Controle de sessão e logins case-insensitive.
- `rbac.test.ts`: Políticas de controle de acesso.
- `multi-tenant.test.ts`: Isolamento de dados entre diferentes contas.
- `sales.test.ts`: Transações atômicas de pedidos e estoque.
- `pagination.test.ts`: Rolagem infinita e cursores de paginação.

---

## 📄 Estrutura de Diretórios Principal

- `/src/app` - Rotas, páginas e APIs da aplicação Next.js (App Router).
- `/src/components` - Componentes React reutilizáveis de interface e formulários.
- `/src/lib` - Utilitários, regras de autenticação (`proxy.ts`), exportação e schemas.
- `/src/store` - Gerenciamento de estado de pedidos e configurações.
- `/prisma` - Modelagem do banco de dados, migrações e seeds.
- `/tests` - Suítes de testes automatizados com Vitest.
