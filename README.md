# 🕊️ Remidos Projeção & Transmissão — Nova Aliança | Master Broadcast

Software profissional para projeção em telão/datashow e transmissão de cultos da **Igreja Remidos em Cristo | Nova Aliança**.

Funciona tanto como **aplicação desktop executável (.exe / Python local)** quanto como **aplicação na nuvem (Render, Railway, Fly.io, Vercel)** com banco de dados em nuvem **Supabase (PostgreSQL)**.

---

## ☁️ Como Conectar ao Supabase (Banco na Nuvem)

Ao conectar ao Supabase, todos os louvores, roteiros de culto e configurações da igreja ficam salvos na nuvem e sincronizados em tempo real entre computadores, celulares e operadores.

### Passo 1: Criar o Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e crie uma conta gratuita.
2. Clique em **"New Project"**, defina um nome (ex: `remidos-broadcast`) e crie uma senha para o banco de dados.

### Passo 2: Criar as Tabelas
1. No menu lateral do Supabase, clique em **SQL Editor** -> **"New query"**.
2. Abra o arquivo [supabase_schema.sql](file:///c:/Users/lucia/Downloads/remidos/supabase_schema.sql) deste projeto, copie todo o seu conteúdo e cole no SQL Editor.
3. Clique em **"Run"**. O script criará as tabelas `songs`, `settings`, `setlists` e já carregará os louvores oficiais da igreja.

### Passo 3: Obter as Chaves de Acesso
1. No Supabase, vá em **Project Settings** (ícone de engrenagem) -> **API**.
2. Copie os valores de:
   - **Project URL** (ex: `https://xyzproject.supabase.co`)
   - **Project API Keys (anon / public)** (ex: `eyJhbGciOi...`)

### Passo 4: Configurar no Sistema
Crie ou edite o arquivo `.env` na raiz do projeto (use [.env.example](file:///c:/Users/lucia/Downloads/remidos/.env.example) como modelo):
```env
SUPABASE_URL=https://xyzproject.supabase.co
SUPABASE_KEY=eyJhbGciOi...
```
*Se as chaves não forem informadas, o sistema continua funcionando normalmente no banco local SQLite (`data/app.db`).*

---

## 🚀 Como Hospedar na Web (24/7 Gratuito)

Como o sistema utiliza **WebSockets em tempo real** para sincronizar o operador com o telão, retorno de palco e OBS sem atraso, recomendamos hospedagem com suporte nativo a processos persistentes:

### 🌟 Opção 1: Render.com (Recomendado — 100% Gratuito)
O Render suporta WebSockets contínuos e o projeto já possui o arquivo [render.yaml](file:///c:/Users/lucia/Downloads/remidos/render.yaml):
1. Suba o código deste projeto para o seu GitHub.
2. Acesse [render.com](https://render.com) e conecte seu GitHub.
3. Clique em **"New"** -> **"Blueprint"** e selecione o repositório `remidos`.
4. Em **Environment Variables**, adicione suas variáveis `SUPABASE_URL` e `SUPABASE_KEY`.
5. Clique em **Apply**. Em poucos minutos seu sistema estará no ar com HTTPS gratuito (ex: `https://remidos-broadcast.onrender.com`).

### 🚆 Opção 2: Railway.app / Fly.io
1. O repositório já inclui [Dockerfile](file:///c:/Users/lucia/Downloads/remidos/Dockerfile) e [Procfile](file:///c:/Users/lucia/Downloads/remidos/Procfile).
2. Conecte o repositório no Railway ou Fly.io e adicione as variáveis de ambiente. O deploy é automático.

### ▲ Opção 3: Vercel
1. O projeto inclui [vercel.json](file:///c:/Users/lucia/Downloads/remidos/vercel.json) configurado para `@vercel/python`.
2. *Nota sobre Serverless:* Funções serverless na Vercel possuem limite de execução e encerram conexões ociosas. Para telão e retorno de palco ao vivo durante cultos de 2h+, plataformas com containers contínuos (como Render ou Railway) são as mais recomendadas.

---

## 🖥️ Telas do Sistema (Acessíveis Localmente ou via URL da Web)

| Tela | Rota Local | Descrição |
|---|---|---|
| **Painel do Operador** | `/admin` | Painel central da equipe de mídia: busca de versículos, louvores, IA Igreja e controle de transmissão. |
| **Telão / Projetor** | `/projector` | Tela limpa de alta resolução para o projetor/LED. Pressione `F11` para tela cheia. |
| **Retorno de Palco** | `/stage` | Monitor para músicos e pregador com relógio grande, slide atual e prévia do próximo slide. |
| **OBS Lower Third** | `/obs` | Fundo transparente para a transmissão ao vivo (YouTube/Facebook/Instagram). |

---

## ⌨️ Atalhos de Teclado no Painel do Operador

- <kbd>→</kbd> ou <kbd>Espaço</kbd>: **Avança para o próximo slide**.
- <kbd>←</kbd>: **Retorna ao slide anterior**.
- <kbd>S</kbd> ou <kbd>B</kbd>: **Blackout** — Apaga o telão instantaneamente (fundo preto).
- <kbd>C</kbd>: **Limpar Texto (Clear)** — Remove o texto mantendo o fundo/tema.
- <kbd>L</kbd>: **Exibir Logo** — Projeta a logo oficial transparente da igreja.
- <kbd>F11</kbd>: **Tela Cheia** na janela do projetor.

---

## 📖 Bíblia Sagrada NVI

- **Mais de 31.000 versículos** salvos com indexação FTS5 de alta velocidade (`data/bible.db`).
- Funciona 100% offline tanto no computador local quanto empacotado no servidor web.
- **Busca Rápida**: digite referências como `Jo 3:16`, `Sl 23`, `Is 40:29-31`, `Rm 8:28`, etc.

---

## 🤖 Módulo IA Igreja (`build.nvidia.com`)

- **Segmentação Automática**: Cole qualquer letra crua ou transcrição de pregação e o sistema divide em blocos rítmicos de 2 a 4 linhas.
- **Salvar Acervo Inteligente**: Ao salvar, o sistema grava no Supabase/banco e muda automaticamente para a aba Louvores, selecionando a música cadastrada.
- **Fallback Offline**: Se estiver sem internet ou sem chave, o sistema possui um formatador inteligente local que divide os slides perfeitamente.
