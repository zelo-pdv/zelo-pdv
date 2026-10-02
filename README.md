# Zelo PDV

O **Zelo PDV** é um sistema completo de Ponto de Venda (PDV) moderno, multi-tenant e responsivo, desenvolvido com **Next.js**, **Prisma** e **Tailwind CSS**. Ele foi projetado para atender lojas do varejo com excelência, segurança e velocidade.

## 🚀 Tecnologias

- **Framework:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Linguagem:** TypeScript
- **Banco de Dados:** SQLite (desenvolvimento) / PostgreSQL (produção) via [Prisma ORM](https://www.prisma.io/)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com/) com shadcn/ui
- **Autenticação & Segurança:** Autenticação via JWT cookies com isolamento de Multi-Tenancy nativo via Middleware (`proxy.ts`).
- **Testes:** [Vitest](https://vitest.dev/) para suíte de testes de regressão E2E.

## 🔒 Arquitetura de Segurança

O sistema possui uma camada de segurança avançada rigorosamente auditada:

1. **Multi-Tenancy Restrito:** Cada usuário e produto pertence exclusivamente a uma `Loja`. Consultas no banco sempre injetam automaticamente o `lojaId`, evitando vazamento de dados entre empresas.
2. **RBAC (Role-Based Access Control):** O sistema utiliza 3 níveis de acesso: `OWNER`, `ADMIN` e `SELLER`.
   - O `OWNER` nunca pode ser excluído ou desativado de sua própria loja.
   - O `SELLER` não tem acesso a páginas ou rotas de API sensíveis de gerência (ex: alterar loja, excluir produtos, gerenciar outros usuários).
3. **Validação E2E no Proxy (`proxy.ts`):** O projeto utiliza um sistema de intercepção no Next.js (equivalente ao `middleware.ts` para a infraestrutura atual) garantindo que nenhuma rota protegida seja acessada por sessões falsificadas ou tokens expirados.
4. **Resiliência a Concorrência (Race Conditions):** O fluxo de fechamento de vendas utiliza transações atômicas com locks otimistas de banco de dados (`UPDATE ... WHERE stock >= qty`) e um loop de retry para colisões do gerador sequencial de recibos da loja (`P2002`).

## ⚙️ Instalação e Execução

### Pré-requisitos
- Node.js >= 18
- [pnpm](https://pnpm.io/) instalado

### Passos

1. Clone o repositório e instale as dependências:
   ```bash
   git clone <repo>
   cd zelo-pdv
   pnpm install
   ```

2. Configure as variáveis de ambiente baseadas no `.env.example`:
   ```bash
   cp .env.example .env
   # Preencha a DATABASE_URL e a JWT_SECRET no .env
   ```

3. Execute as migrações do Prisma para criar as tabelas no banco:
   ```bash
   pnpm prisma migrate dev
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   pnpm dev
   ```

5. O sistema estará disponível em [http://localhost:3000](http://localhost:3000).

## 🧪 Testes de Regressão E2E

O Zelo PDV conta com uma suíte abrangente de testes *End-to-End* integrada (E2E) construída em **Vitest**, que simula um servidor real conectando em um banco de testes real.

Para executar a suíte de testes E2E:

```bash
# Certifique-se de não estar com o servidor rodando na mesma porta, ou deixe que os testes subam um servidor aleatório interno.
pnpm test:e2e
```

A suíte cobre:
- `auth.test.ts`: Controle de sessão e logins case-insensitive.
- `rbac.test.ts`: Tenta invadir rotas protegidas usando tokens de SELLER.
- `multi-tenant.test.ts`: Valida o vazamento (ou ausência de vazamento) de dados entre duas lojas diferentes simultâneas.
- `sales.test.ts`: Transações com concorrência alta, estoques atômicos e exclusão com estorno de inventário.
- `pagination.test.ts`: Integridade na rolagem infinita/cursores de páginação de recibos.

## 📄 Estrutura de Diretórios Principal

- `/src/app` - Rotas, páginas e APIs da aplicação Next.js.
- `/src/components` - Componentes React reutilizáveis da UI.
- `/src/lib` - Utilitários, configurações (ex: inicialização do Prisma, `proxy.ts`, esquemas de validação).
- `/prisma` - Schemas do banco de dados e migrações.
- `/tests` - Suítes de testes automatizados Vitest.
