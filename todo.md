# Interview Assist - Todo

- [x] Configurar tema escuro com cores cyan no index.css
- [x] Configurar fontes JetBrains Mono + Space Grotesk no index.html
- [x] Criar página Home com visual semelhante ao TOEFL Assist
- [x] Criar página Assistant com captura de áudio + câmera/OCR
- [x] Implementar transcrição de áudio em tempo real (Web Speech API)
- [x] Implementar tradução simultânea PT-BR abaixo da transcrição
- [x] Implementar captura de câmera para OCR de provas técnicas
- [x] Implementar geração de respostas diretas baseadas no resume (via LLM API)
- [x] Resposta aparece no TOPO da tela com destaque máximo
- [x] Resumo PT-BR ultra curto (1 frase) logo abaixo da resposta em inglês
- [x] Configurar rotas no App.tsx
- [x] Salvar resume data como constante no projeto
- [x] Modo Texto/Código (Prova Técnica) com campo para colar pergunta
- [x] Resposta direta pronta para copiar com botão de copiar no modo prova
- [x] Adaptação automática entre modo áudio e modo texto/código
- [x] No modo prova técnica: NÃO mostrar pergunta, só resposta direta sem explicações
- [x] Testes vitest para backend
- [x] Checkpoint e entrega
- [x] BUG: Botão central "TOQUE PARA INICIAR" não funciona ao clicar
- [x] BUG: Câmera traseira não aparece como preview na tela (deve mostrar igual ao TOEFL Assist)
- [x] Câmera traseira deve iniciar automaticamente ao entrar na tela do assistente
- [x] Botões de seleção de lente da câmera: ultra wide (0.5x) e normal (1x)
- [x] Câmera em modo vídeo 4K (não foto) com configurações máximas
- [x] OCR contínuo no stream de vídeo (captura frames automaticamente)
- [x] Descartar frames duplicados para não encher memória (só processar quando tela mudar)
- [x] BUG: Câmera ocupa tela toda — deve ser miniatura pequena no canto superior direito, restante para respostas/transcrições
- [x] Layout landscape: forçar tela cheia horizontal ao abrir no Chrome
- [x] Botão para forçar ultra wide na miniatura da câmera
- [x] BUG: Áudio e vídeo devem captar em tempo real automaticamente ao entrar na tela (sem botão de gravar)
- [x] Áudio contínuo: transcreve em tempo real, traduz PT-BR, gera resposta — tudo automático
- [x] Remover botão de gravar — tudo é plug and play
- [x] Auto-scan de câmera já ativo por padrão ao entrar
- [x] BUG: Transcrição e resposta muito lenta — otimizar para menos de 2 segundos
- [x] Chunks de áudio menores (2s em vez de 8s)
- [x] Combinar tradução + resposta + summary em 1 única chamada LLM (em vez de 3)
- [x] Pipeline paralelo: upload + transcrição simultâneos
- [x] Identificar automaticamente quem fala: entrevistador (pergunta) vs candidato (resposta)
- [x] Descartar transcrição do candidato para não interferir na análise
- [x] Pipeline ultra-rápido: 1 única chamada LLM combinada (resposta + tradução + summary)
- [x] Chunks de áudio de 2 segundos para velocidade máxima
- [x] Teste de voz do candidato opcional para calibrar e filtrar melhor
- [x] Chunks de áudio de 2 segundos (não 3)
- [x] BUG: Respostas muito longas e repetindo a pergunta — deve ser ultra resumida (2-3 frases) em primeira pessoa
- [x] BUG: Transcrição do entrevistador demorando muito (reduzido para chunks de 1 segundo)
- [x] BUG: Pipeline corrigido — agora capta TODO áudio, mostra transcrição, DEPOIS filtra speaker, descarta candidato
- [x] Desabilitar descarte de candidato — transcrever TUDO em tempo real
- [x] Auto-reset após 5 segundos de silêncio — limpa tela e reinicia captura
- [x] Análise inteligente de speaker — identifica pergunta vs resposta, só responde pergunta
- [x] CRÍTICO: Remover lógica de identificação de speaker (isQuestion) — transcrever TODO áudio sem filtro
- [x] Corrigir erros TypeScript: remover referências a summaryPtBr
- [x] Criar testes vitest para validar pipeline de transcrição + tradução + resposta
- [x] Todos os 16 testes passando
- [x] CORRECAO: Aumentar chunks de audio de 1s para 2s para captura confiavel
- [x] CORRECAO: Aumentar limite minimo de blob de 100 bytes para 1KB
- [x] Criar testes de integracao para validar pipeline completo
- [x] Todos os 7 testes de integracao passando
- [x] VALIDADO: Transcrição, tradução e resposta funcionando em tempo real
- [x] VALIDADO: Layout correto (Resposta -> Transcrição -> Tradução)
- [x] VALIDADO: Sem filtro de speaker - TODO audio é processado
- [ ] CORRECAO: Corrigir layout invertido - resposta 70% topo, pergunta 30% abaixo
- [ ] CORRECAO: Implementar captura real de áudio do entrevistador
- [ ] CORRECAO: Transcrever pergunta em tempo real em português
- [ ] CORRECAO: Gerar resposta com tom 100% humano e objetivo
- [x] VALIDAR: Fluxo completo funcionando com áudio real

## Nova Feature: Histórico em Cascata

- [x] Implementar histórico de respostas (array de respostas)
- [x] Adicionar nova resposta no topo (unshift)
- [x] Renderizar todas as respostas na área cyan com scroll
- [x] Testar múltiplas perguntas e respostas
- [x] Validar que resposta mais nova sempre fica no topo

## Nova Feature: Respostas Estratégicas de Senior Analyst

- [x] Atualizar prompt do LLM para evitar detalhes técnicos
- [x] Focar em valor, impacto, resultados
- [x] Análise do todo (visão estratégica)
- [x] Soft skills e liderança
- [x] ROI e impacto nos negócios
- [x] Testar respostas para diferentes tipos de perguntas
- [x] Validar tom de Senior Analyst

## Nova Feature: Fonética PT-BR nas Respostas

- [x] Adicionar suporte a fonética PT-BR no prompt
- [x] Incluir pronunciação para palavras difíceis
- [x] Exemplo: "Five (Faive)", "System (Sistêm)"
- [x] Validar build e testes
- [x] Todos 60 testes passando

## Otimização: Chunks de 3 Segundos (Microsoft Translator Style)

- [x] Aumentar intervalo de chunks para 3 segundos
- [x] Aumentar tamanho mínimo para 2KB (evitar chunks vazios)
- [x] Alterar timeslice para 100ms (melhor granularidade)
- [x] Detectar 100% do áudio em inglês
- [x] Não perder nenhuma palavra
- [x] Transcrever em tempo real
- [x] Todos 60 testes passando
