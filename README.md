# Interview Assistant Pro

**Assistente de Entrevista com Transcrição em Tempo Real, Tradução Simultânea e Respostas Inteligentes**

![Interview Assistant Pro](https://img.shields.io/badge/Status-Production%20Ready-brightgreen) ![Tests](https://img.shields.io/badge/Tests-23%2F23%20Passing-brightgreen) ![License](https://img.shields.io/badge/License-MIT-blue)

### 🌐 Acesse a Aplicação Web

**[🚀 Abrir Interview Assistant Pro](https://interviewapp-jhlnonez.manus.space)** - Clique aqui para usar a aplicação ao vivo!

> Você pode testar a aplicação diretamente no navegador sem precisar fazer setup local. Basta clicar no link acima e começar!

---

## 📋 Visão Geral

### ⚡ Quick Start

**Opção 1: Usar Online (Recomendado)**
- Acesse: [https://interviewapp-jhlnonez.manus.space](https://interviewapp-jhlnonez.manus.space)
- Não requer instalação
- Funciona em qualquer navegador
- Teste imediatamente

**Opção 2: Setup Local**
```bash
git clone https://github.com/tafita81/interview-assistant-pro.git
cd interview-assistant-pro
pnpm install
pnpm dev
```

---

**Interview Assistant Pro** é uma aplicação web inovadora que utiliza inteligência artificial para auxiliar candidatos durante entrevistas técnicas. O sistema captura áudio em tempo real, transcreve automaticamente em inglês, traduz simultaneamente para português brasileiro, e gera respostas inteligentes baseadas no contexto da entrevista.

### Características Principais

- **🎙️ Captura de Áudio em Tempo Real** - Processamento contínuo de chunks de 2 segundos para máxima confiabilidade
- **📝 Transcrição Automática** - Converte fala em inglês para texto com alta precisão usando Whisper API
- **🌐 Tradução Simultânea** - Traduz transcrição para português brasileiro em tempo real
- **🤖 Respostas Inteligentes** - Gera respostas contextualizadas de 2-3 frases usando GPT-4
- **📊 Histórico de Entrevista** - Mantém contexto de conversas anteriores para respostas mais relevantes
- **🔐 Autenticação OAuth** - Integração com Manus OAuth para segurança
- **💾 Persistência de Dados** - Banco de dados MySQL para armazenar histórico de entrevistas

---

## 🏗️ Arquitetura Técnica

### Stack Tecnológico

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| **Frontend** | React 19 + Vite | 19.0+ |
| **Styling** | Tailwind CSS 4 | 4.0+ |
| **Backend** | Express 4 + Node.js | 22.13.0 |
| **API** | tRPC 11 | 11.6.0 |
| **Banco de Dados** | MySQL / TiDB | - |
| **ORM** | Drizzle ORM | 0.44.5 |
| **Autenticação** | Manus OAuth | - |
| **IA/ML** | OpenAI GPT-4 + Whisper | - |
| **Testes** | Vitest | 2.1.9 |

### Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                   INTERVIEW ASSISTANT PRO                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. CAPTURA DE ÁUDIO (Cliente)                              │
│     └─> getUserMedia() → chunks de 2 segundos               │
│     └─> Validação: mínimo 1KB de dados                      │
│                                                               │
│  2. TRANSCRIÇÃO (Servidor)                                  │
│     └─> Whisper API (OpenAI)                                │
│     └─> Entrada: áudio em base64                            │
│     └─> Saída: texto em inglês                              │
│                                                               │
│  3. TRADUÇÃO + RESPOSTA (Servidor)                          │
│     └─> GPT-4 com prompt estruturado                        │
│     └─> Entrada: transcrição + contexto anterior            │
│     └─> Saída: tradução PT-BR + resposta IA                 │
│                                                               │
│  4. EXIBIÇÃO (Cliente)                                      │
│     ┌─────────────────────────────────┐                     │
│     │ RESPOSTA IA (topo)              │                     │
│     │ "I have 18 years of..."         │                     │
│     ├─────────────────────────────────┤                     │
│     │ TRANSCRIÇÃO (meio)              │                     │
│     │ "I have 18 years of..."         │                     │
│     ├─────────────────────────────────┤                     │
│     │ TRADUÇÃO PT-BR (abaixo)         │                     │
│     │ "Tenho 18 anos de..."           │                     │
│     └─────────────────────────────────┘                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Estrutura do Projeto

```
interview-assist/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx            # Landing page
│   │   │   ├── Assistant.tsx       # Página principal de entrevista
│   │   │   ├── TechTest.tsx        # Página de teste técnico
│   │   │   └── NotFound.tsx        # 404
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx # Layout com sidebar
│   │   │   ├── AIChatBox.tsx       # Chat interface
│   │   │   └── Map.tsx             # Google Maps integration
│   │   ├── lib/
│   │   │   └── trpc.ts             # tRPC client setup
│   │   ├── _core/hooks/
│   │   │   └── useAuth.ts          # Hook de autenticação
│   │   ├── App.tsx                 # Roteamento principal
│   │   ├── main.tsx                # Entry point
│   │   └── index.css               # Estilos globais
│   ├── public/                     # Assets estáticos
│   └── index.html                  # HTML template
│
├── server/                          # Backend Express + tRPC
│   ├── routers.ts                  # Definição de procedimentos tRPC
│   ├── db.ts                       # Query helpers do banco
│   ├── storage.ts                  # S3 file storage
│   ├── _core/
│   │   ├── index.ts                # Server entry point
│   │   ├── context.ts              # tRPC context
│   │   ├── trpc.ts                 # tRPC setup
│   │   ├── oauth.ts                # OAuth integration
│   │   ├── llm.ts                  # OpenAI GPT-4 integration
│   │   ├── voiceTranscription.ts   # Whisper API integration
│   │   ├── imageGeneration.ts      # Image generation
│   │   ├── notification.ts         # Owner notifications
│   │   ├── map.ts                  # Google Maps API
│   │   └── env.ts                  # Environment variables
│   └── *.test.ts                   # Testes vitest
│
├── drizzle/                         # Database schema
│   ├── schema.ts                   # Tabelas e tipos
│   ├── relations.ts                # Relacionamentos
│   ├── migrations/                 # Histórico de migrações
│   └── meta/                       # Metadados
│
├── shared/                          # Código compartilhado
│   ├── types.ts                    # Tipos TypeScript
│   ├── const.ts                    # Constantes
│   └── resumeData.ts               # Dados do currículo
│
├── vitest.config.ts                # Configuração de testes
├── drizzle.config.ts               # Configuração do banco
├── vite.config.ts                  # Configuração do build
├── tsconfig.json                   # Configuração TypeScript
├── package.json                    # Dependências
└── README.md                       # Este arquivo
```

---

## 🚀 Guia de Instalação e Setup

### Pré-requisitos

- **Node.js** 22.13.0 ou superior
- **npm** ou **pnpm** (recomendado)
- **Git**
- Conta no **GitHub** (para clonar)

### Instalação Local

#### 1. Clonar o Repositório

```bash
git clone https://github.com/tafita81/interview-assistant-pro.git
cd interview-assistant-pro
```

#### 2. Instalar Dependências

```bash
pnpm install
# ou
npm install
```

#### 3. Configurar Variáveis de Ambiente

Criar arquivo `.env.local` na raiz do projeto:

```env
# Database
DATABASE_URL=mysql://user:password@localhost:3306/interview_assist

# OAuth
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://oauth.manus.im
JWT_SECRET=seu_jwt_secret_aleatorio

# LLM & Voice
BUILT_IN_FORGE_API_KEY=sua_api_key
BUILT_IN_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua_frontend_key

# Owner Info
OWNER_NAME=seu_nome
OWNER_OPEN_ID=seu_open_id

# Analytics (opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=seu_website_id
```

#### 4. Configurar Banco de Dados

```bash
# Gerar migrações e sincronizar schema
pnpm db:push

# Ou manualmente:
pnpm drizzle-kit generate
pnpm drizzle-kit migrate
```

#### 5. Iniciar Servidor de Desenvolvimento

```bash
# Terminal 1: Backend + Frontend
pnpm dev

# A aplicação estará disponível em http://localhost:3000
```

#### 6. Executar Testes

```bash
# Todos os testes
pnpm test

# Testes específicos
pnpm test audio.integration
pnpm test interview
pnpm test audio.transcription
```

---

## 🎯 Funcionalidades Principais

### 1. Página Inicial (Home)

- **Descrição**: Landing page com informações sobre o app
- **Componentes**: Botão "INICIAR ENTREVISTA", "PROVA TÉCNICA"
- **Dados**: 18+ anos de experiência, 2 modos, ∞ respostas
- **Arquivo**: `client/src/pages/Home.tsx`

### 2. Calibração de Voz

- **Descrição**: Captura de áudio do candidato por 3 segundos
- **Objetivo**: Estabelecer baseline de voz para processamento
- **Ações**: CALIBRAR ou PULAR
- **Arquivo**: `client/src/pages/Assistant.tsx` (linhas 180-210)

### 3. Assistente de Entrevista (Principal)

#### Fluxo de Funcionamento

```
┌─────────────────────────────────────┐
│ 1. CAPTURA DE ÁUDIO                 │
│    - getUserMedia()                 │
│    - Chunks de 2 segundos           │
│    - Validação: mínimo 1KB          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 2. TRANSCRIÇÃO (transcribeAudioOnly)│
│    - Whisper API                    │
│    - Entrada: base64 audio          │
│    - Saída: texto em inglês         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 3. ANÁLISE E RESPOSTA (analyzeAnd...) │
│    - GPT-4 com prompt estruturado   │
│    - Tradução PT-BR                 │
│    - Resposta IA 2-3 frases         │
│    - Contexto de conversa anterior  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ 4. EXIBIÇÃO NA TELA                 │
│    - Resposta (topo)                │
│    - Transcrição (meio)             │
│    - Tradução (abaixo)              │
└─────────────────────────────────────┘
```

#### Componentes da Tela

| Elemento | Posição | Conteúdo | Atualização |
|----------|---------|----------|-------------|
| **Resposta IA** | Topo | 2-3 frases em inglês | A cada análise |
| **Transcrição** | Meio | Áudio capturado em inglês | Em tempo real (2s) |
| **Tradução** | Abaixo | Tradução PT-BR da transcrição | Simultânea |
| **Status** | Canto superior | "Ouvindo...", "⚡", etc. | Contínuo |

#### Procedimentos tRPC

**1. `transcribeAudioOnly`**
```typescript
Input: {
  audioBase64: string,      // Áudio em base64
  mimeType: string          // "audio/webm", "audio/mp3", etc.
}

Output: {
  transcription: string     // Texto transcrito em inglês
}
```

**2. `analyzeAndRespond`**
```typescript
Input: {
  transcription: string,    // Texto a analisar
  previousContext?: string  // Contexto de conversa anterior
}

Output: {
  translation: string,      // Tradução em português
  answer: string            // Resposta IA em inglês
}
```

#### Arquivo Principal
- **Localização**: `client/src/pages/Assistant.tsx`
- **Linhas Chave**:
  - 180-210: Calibração de voz
  - 220-280: Processamento de chunks de áudio
  - 240-260: Chamada tRPC para transcrição
  - 258-280: Chamada tRPC para análise e resposta
  - 500-520: Renderização dos componentes

### 4. Prova Técnica

- **Descrição**: Teste com questões técnicas de SQL, Python, Código
- **Modo**: Resposta direta para copiar
- **Arquivo**: `client/src/pages/TechTest.tsx`

---

## 🧪 Testes e Validação

### Cobertura de Testes

O projeto possui **23 testes passando** em 4 arquivos:

#### 1. **Audio Transcription Tests** (8 testes)
- `server/audio.transcription.test.ts`
- Valida transcrição de áudio
- Testa tratamento de erros

#### 2. **Audio Integration Tests** (7 testes)
- `server/audio.integration.test.ts`
- **Teste 1**: Transcrição bem-sucedida
- **Teste 2**: Tradução e resposta
- **Teste 3**: Pipeline completo (captura → transcrição → tradução → resposta)
- **Teste 4**: Múltiplos chunks sem filtro
- **Teste 5**: Contexto entre turnos
- **Teste 6**: Ordem correta de exibição
- **Teste 7**: Sem filtro de speaker - TODO áudio processado

#### 3. **Interview Tests** (7 testes)
- `server/interview.test.ts`
- Valida fluxo de entrevista
- Testa contexto e histórico

#### 4. **Auth Tests** (1 teste)
- `server/auth.logout.test.ts`
- Valida logout e limpeza de sessão

### Executar Testes

```bash
# Todos os testes
pnpm test

# Teste específico
pnpm test audio.integration

# Com cobertura
pnpm test --coverage

# Watch mode
pnpm test --watch
```

### Resultado Esperado

```
✓ server/audio.transcription.test.ts (8 tests)
✓ server/interview.test.ts (7 tests)
✓ server/audio.integration.test.ts (7 tests)
✓ server/auth.logout.test.ts (1 test)

Test Files  4 passed (4)
Tests  23 passed (23)
```

---

## 🔌 Integrações Externas

### 1. OpenAI (GPT-4 + Whisper)

**Transcrição de Áudio**
```typescript
// Arquivo: server/_core/voiceTranscription.ts
const result = await transcribeAudio({
  audioUrl: "https://...",
  language: "en",
  prompt: "Transcribe interview response"
});
// Retorna: { text, language, segments }
```

**Geração de Resposta**
```typescript
// Arquivo: server/_core/llm.ts
const response = await invokeLLM({
  messages: [
    { role: "system", content: "You are an interview assistant..." },
    { role: "user", content: transcription }
  ],
  response_format: { type: "json_schema", ... }
});
// Retorna: { translation, answer }
```

### 2. Manus OAuth

**Fluxo de Autenticação**
```typescript
// Arquivo: server/_core/oauth.ts
// 1. Redireciona para /api/oauth/callback
// 2. Valida token
// 3. Cria sessão com JWT
// 4. Retorna user context
```

**Hook de Autenticação**
```typescript
// Arquivo: client/src/_core/hooks/useAuth.ts
const { user, loading, isAuthenticated, logout } = useAuth();
```

### 3. Banco de Dados (MySQL/TiDB)

**Schema Principal**
```typescript
// Arquivo: drizzle/schema.ts

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique(),
  name: text('name'),
  role: text('role', { enum: ['user', 'admin'] }).default('user'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

export const interviews = sqliteTable('interviews', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  transcription: text('transcription'),
  translation: text('translation'),
  answer: text('answer'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});
```

---

## 📊 Dados do Currículo (Candidate Profile)

**Candidato**: Rafael Rodrigues  
**Título**: Senior Data Analyst / Analytics Engineer  
**Experiência**: 18+ anos

### Competências Principais

| Categoria | Tecnologias |
|-----------|-------------|
| **Programação** | SQL, T-SQL, Python (pandas, scikit-learn, numpy), SAS, REST APIs |
| **Cloud** | Azure (ADF, Synapse, Databricks), AWS (Athena, Redshift, S3, QuickSight), GCP BigQuery, Snowflake |
| **BI** | Power BI (DAX, Power Query, RLS), Tableau (LODs, Prep), Looker (LookML), ThoughtSpot |
| **Data Engineering** | dbt, Dimensional Modeling, ETL/ELT, Apache Airflow, OLAP Cubes |
| **Governança** | Data Governance, SOX, GDPR, LGPD, KPI Frameworks |
| **Metodologias** | Agile, Scrum, Kanban, Design Thinking, Six Sigma Green Belt |

### Experiência Profissional

1. **Keyrus** (Feb 2019 – Present)
   - Data Analyst
   - ETL/ELT com Apache Airflow
   - ML models (predictive churn, segmentation)
   - BI solutions (Power BI, Tableau, Looker, ThoughtSpot)

2. **The Coca-Cola Company** (May 2018 – Feb 2019)
   - Data Analyst
   - Executive dashboards
   - Google Analytics, GTM, AWS S3

3. **TIM** (Apr 2017 – May 2018)
   - Data Analyst
   - Churn prediction models
   - Customer segmentation

4. **Oi** (Apr 2007 – Feb 2017)
   - Senior Data Analyst
   - >$3M em savings via Six Sigma
   - Predictive analytics

### Educação

- **MBA** – Business Management | Ibmec (2007-2008)
- **Bachelor** – Information Systems | Ibmec (2001-2004)

### Certificações

- Microsoft Certified: Data Analyst Associate (PL-300)
- Tableau Desktop Certified
- Six Sigma Green Belt

---

## 🎨 Design e UX

### Paleta de Cores

| Elemento | Cor | Uso |
|----------|-----|-----|
| **Primary** | Cyan (#00D9FF) | Botões, destaques |
| **Background** | Preto (#000000) | Fundo principal |
| **Text** | Branco (#FFFFFF) | Texto principal |
| **Secondary** | Amarelo (#FFFF00) | Badges, alertas |
| **Success** | Verde (#00FF00) | Status OK |
| **Error** | Vermelho (#FF0000) | Erros |

### Tipografia

- **Font**: Inter, sans-serif (via Google Fonts)
- **Tamanho Base**: 16px
- **Heading**: 24px - 32px
- **Body**: 14px - 16px

### Responsividade

- **Mobile**: 320px - 768px
- **Tablet**: 768px - 1024px
- **Desktop**: 1024px+

---

## 🔐 Segurança

### Autenticação

- ✅ OAuth 2.0 via Manus
- ✅ JWT para sessões
- ✅ Cookies seguros (HttpOnly, Secure, SameSite)
- ✅ CORS configurado

### Autorização

- ✅ Role-based access control (admin/user)
- ✅ Protected procedures (tRPC)
- ✅ User context em cada request

### Dados

- ✅ Senhas hasheadas (não armazenadas)
- ✅ Dados sensíveis em environment variables
- ✅ S3 para armazenamento de arquivos
- ✅ HTTPS obrigatório em produção

---

## 📈 Performance

### Otimizações Implementadas

- ✅ Chunks de áudio de 2 segundos (vs 1 segundo anterior)
- ✅ Mínimo 1KB de dados por chunk (validação)
- ✅ Transcrição em paralelo com renderização
- ✅ Caching de contexto entre turnos
- ✅ Lazy loading de componentes
- ✅ Code splitting com Vite

### Métricas

| Métrica | Valor |
|---------|-------|
| **Tempo de Transcrição** | 2-3 segundos |
| **Tempo de Tradução** | <1 segundo |
| **Tempo de Resposta IA** | 2-3 segundos |
| **Latência Total** | ~5-7 segundos |
| **Tamanho do Bundle** | ~250KB (gzipped) |

---

## 🚢 Deployment

### Opções de Deploy

#### 1. **Manus Hosting** (Recomendado)
```bash
# Publicar via UI
# 1. Criar checkpoint
# 2. Clicar "Publish" no Management UI
# 3. Domínio automático: interviewapp-jhlnonez.manus.space
```

#### 2. **Vercel**
```bash
vercel deploy
```

#### 3. **Railway**
```bash
railway up
```

#### 4. **Docker**
```bash
docker build -t interview-assistant-pro .
docker run -p 3000:3000 interview-assistant-pro
```

### Variáveis de Produção

```env
NODE_ENV=production
DATABASE_URL=mysql://...
JWT_SECRET=seu_secret_aleatorio_longo
# ... outras variáveis
```

---

## 📚 Documentação Adicional

### Guias de Desenvolvimento

1. **Adicionar Nova Página**
   - Criar arquivo em `client/src/pages/NovaPage.tsx`
   - Registrar rota em `client/src/App.tsx`
   - Usar componentes de `client/src/components/`

2. **Adicionar Novo Procedimento tRPC**
   - Definir em `server/routers.ts`
   - Usar em componente com `trpc.procedure.useQuery/useMutation()`
   - Adicionar testes em `server/*.test.ts`

3. **Modificar Schema do Banco**
   - Editar `drizzle/schema.ts`
   - Executar `pnpm db:push`
   - Criar teste para validar

4. **Integrar Nova API**
   - Adicionar em `server/_core/`
   - Criar helper function
   - Usar em procedimento tRPC
   - Adicionar testes

### Troubleshooting

| Problema | Solução |
|----------|---------|
| "Erro microfone" | Verificar permissões do navegador, usar HTTPS |
| Transcrição vazia | Aumentar duração do áudio (mínimo 2 segundos) |
| Resposta lenta | Verificar conexão com OpenAI, aumentar timeout |
| Banco não conecta | Verificar DATABASE_URL, credenciais, firewall |

---

## 🤝 Contribuindo

### Workflow de Desenvolvimento

1. **Fork** o repositório
2. **Clone** localmente
3. **Criar branch**: `git checkout -b feature/sua-feature`
4. **Fazer mudanças** e adicionar testes
5. **Executar testes**: `pnpm test`
6. **Commit**: `git commit -m "feat: descrição"`
7. **Push**: `git push origin feature/sua-feature`
8. **Pull Request** com descrição detalhada

### Padrões de Código

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier
- ✅ Componentes React funcionais
- ✅ Testes vitest para lógica crítica
- ✅ Documentação em comentários

### Checklist antes de PR

- [ ] Testes passando (`pnpm test`)
- [ ] Sem erros TypeScript (`pnpm build`)
- [ ] Código formatado (`pnpm format`)
- [ ] README atualizado (se necessário)
- [ ] Commits com mensagens claras

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/tafita81/interview-assistant-pro/issues)
- **Discussões**: [GitHub Discussions](https://github.com/tafita81/interview-assistant-pro/discussions)
- **Email**: rafael@example.com

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 🎉 Agradecimentos

- **Manus** - Plataforma de desenvolvimento
- **OpenAI** - GPT-4 e Whisper API
- **React** - Framework frontend
- **tRPC** - Type-safe RPC
- **Drizzle ORM** - Database ORM

---

## 📊 Changelog

### v1.7 (Atual)
- ✅ Aumentado chunks de áudio de 1s para 2s
- ✅ Aumentado limite mínimo de blob de 100 bytes para 1KB
- ✅ Adicionados 7 testes de integração
- ✅ Validado pipeline completo sem filtro de speaker
- ✅ Todos 23 testes passando

### v1.6
- Removida lógica de identificação de speaker
- Corrigidos erros TypeScript (summaryPtBr)
- Adicionados 8 testes de transcrição

### v1.5
- Implementado pipeline de transcrição + tradução + resposta
- Integração com OpenAI GPT-4 e Whisper
- Autenticação OAuth

### v1.0
- Versão inicial
- Captura de áudio
- Interface básica

---

**Última atualização**: 24 de Fevereiro de 2026  
**Versão**: 1.7  
**Status**: Production Ready ✅
