# Brainstorm de Design - Interview Assistant Pro

## Contexto
App para entrevistas em inglês com captura de áudio em tempo real, OCR de tela para provas técnicas, e respostas diretas baseadas no resume do usuário. Visual semelhante ao TOEFL Assist existente (tema escuro, cores cyan, minimalista).

---

<response>
## Idea 1: "Cyber Command Center"
<probability>0.08</probability>

**Design Movement**: Cyberpunk / HUD militar — interfaces de comando inspiradas em cockpits e centros de controle.

**Core Principles**:
1. Informação hierárquica com prioridade visual (resposta sempre no topo, destaque máximo)
2. Fundo 100% preto com elementos em cyan/verde neon como acentos
3. Tipografia monospace para dados técnicos, sans-serif condensada para títulos
4. Zero decoração desnecessária — cada pixel tem função

**Color Philosophy**: Preto absoluto (#000000) como base para máximo contraste. Cyan (#00FFFF) como cor primária de ação e destaque. Verde neon (#00FF88) para status de sucesso/gravação. Vermelho (#FF3333) para alertas. A paleta simula terminais de alta tecnologia, transmitindo confiança e velocidade.

**Layout Paradigm**: Layout vertical full-screen dividido em zonas: Zona Superior (30%) = Resposta/Output com destaque máximo. Zona Central (50%) = Transcrição em tempo real + contexto. Zona Inferior (20%) = Controles e status. Sem margens laterais desperdiçadas.

**Signature Elements**:
1. Borda pulsante cyan ao redor da área de resposta quando ativa
2. Indicador de áudio com ondas animadas em tempo real
3. Badge de status com glow effect (REC, PROCESSING, READY)

**Interaction Philosophy**: Toque único para iniciar/parar. Sem menus complexos. A interface reage ao estado do áudio automaticamente.

**Animation**: Texto da resposta aparece com efeito typewriter rápido. Transições de estado com fade suave de 200ms. Ondas de áudio em canvas animado. Pulse effect no botão de gravação.

**Typography System**: JetBrains Mono para transcrições e código. Space Grotesk para títulos e respostas. Hierarquia: Resposta (20px bold), Transcrição (16px regular), Status (12px light).
</response>

---

<response>
## Idea 2: "Stealth Terminal"
<probability>0.06</probability>

**Design Movement**: Terminal hacker / Matrix — estética de terminal Unix com toques modernos.

**Core Principles**:
1. Tudo parece um terminal de comando sofisticado
2. Texto verde fosforescente sobre preto
3. Sem bordas arredondadas — tudo angular e preciso
4. Informação flui como output de terminal

**Color Philosophy**: Preto (#0a0a0a) com verde terminal (#00FF41) e amber (#FFB000) para warnings. Estética de monitor CRT dos anos 80 modernizada.

**Layout Paradigm**: Single column terminal-like com scroll. Output no topo, input na base. Cada seção separada por linhas tracejadas como separadores de terminal.

**Signature Elements**:
1. Cursor piscante no estilo terminal
2. Prefixos de linha como ">>> ANSWER:" e "--- TRANSCRIPT:"
3. Scanline effect sutil no fundo

**Interaction Philosophy**: Minimalista ao extremo. Um botão para gravar, tudo mais é automático.

**Animation**: Texto aparece caractere por caractere. Scanlines sutis. Glow pulsante no texto ativo.

**Typography System**: Fira Code para tudo. Variação apenas em peso e tamanho.
</response>

---

<response>
## Idea 3: "Dark Glass HUD"
<probability>0.07</probability>

**Design Movement**: Glassmorphism escuro — painéis translúcidos sobre fundo escuro profundo, inspirado em interfaces de carros elétricos e dashboards premium.

**Core Principles**:
1. Camadas de vidro escuro com blur backdrop
2. Hierarquia clara com luminosidade (mais brilhante = mais importante)
3. Bordas sutis com gradiente de luz
4. Espaço generoso entre elementos

**Color Philosophy**: Fundo escuro profundo (#0C0C14) com painéis em rgba(255,255,255,0.05). Cyan (#00E5FF) como accent primário. Branco com opacidades variadas para hierarquia textual.

**Layout Paradigm**: Cards flutuantes em glassmorphism empilhados verticalmente. Resposta em card destacado no topo com borda luminosa. Transcrição em card secundário. Controles em barra fixa na base.

**Signature Elements**:
1. Cards com backdrop-blur e borda gradiente luminosa
2. Orb animado como indicador de IA processando
3. Micro-animações de entrada com spring physics

**Interaction Philosophy**: Gestos naturais, feedback visual imediato. Cards expandem/colapsam com animação fluida.

**Animation**: Spring-based transitions. Orb de IA pulsa e muda de cor conforme estado. Cards entram com slide-up suave.

**Typography System**: Space Grotesk para display. Inter para corpo. JetBrains Mono para código/transcrição.
</response>

---

## Decisão: Idea 1 — "Cyber Command Center"

Escolhida por ser a mais próxima do visual do TOEFL Assist existente (fundo preto, cyan, JetBrains Mono, minimalista funcional) e por priorizar a velocidade de leitura da resposta no topo da tela.
