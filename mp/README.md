# Eu Duvido — Multiplayer em tempo real

Cada dupla joga no seu próprio celular. Uma pessoa cria a sala, compartilha o
código, e todo mundo entra escolhendo seu assento. O servidor é a autoridade
do jogo: ele decide quem pode ver o desafio, quem pode apostar, quem pode
duvidar e quem pode julgar respostas — cada celular só recebe as informações
que aquele jogador tem permissão de ver.

## Rodando localmente

```bash
npm install
npm start
```

Abra `http://localhost:3000` em algumas abas (ou celulares na mesma rede,
usando o IP local da máquina) para simular várias duplas.

## Subir no GitHub

```bash
git init
git add .
git commit -m "Eu Duvido multiplayer"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/eu-duvido.git
git push -u origin main
```

## Subir no Render

Esse projeto precisa de um servidor Node rodando o tempo todo (o WebSocket
fica aberto durante a partida), então no Render use um **Web Service** (não
um Static Site):

1. New → Web Service → conecte o repositório do GitHub.
2. Build Command: `npm install`
3. Start Command: `npm start`
4. Nenhuma variável de ambiente é obrigatória (o Render define `PORT`
   automaticamente e o `server.js` já usa `process.env.PORT`).
5. Depois do deploy, o Render te dá uma URL tipo
   `https://eu-duvido.onrender.com` — é esse link que todo mundo abre.

No plano gratuito do Render o serviço "dorme" depois de um tempo sem uso; a
primeira conexão depois disso demora alguns segundos para acordar o servidor.

## E o Cloudflare?

Vale um esclarecimento honesto aqui: o **Cloudflare Pages** hospeda apenas
sites estáticos/serverless de borda — ele não mantém um processo Node
rodando o tempo todo, então não dá pra rodar o `server.js` (com WebSocket
com estado) diretamente nele. As opções reais são:

- **Mais simples (recomendado):** deixe o Render rodando o jogo inteiro
  (frontend + backend) e, se quiser, aponte um domínio seu para essa URL
  usando o Cloudflare só como DNS/CDN na frente do Render.
- **Alternativa mais trabalhosa:** reescrever o motor do jogo para rodar em
  **Cloudflare Workers + Durable Objects** (que suportam WebSocket com
  estado). Isso é uma implementação bem diferente da que está aqui — dá pra
  fazer, mas é essencialmente outro backend. Me avise se quiser que eu monte
  essa versão.

## Estrutura do projeto

```
server.js        → servidor HTTP + WebSocket, roteia mensagens dos clientes
gameLogic.js      → todas as regras do jogo (sala, rodadas, apostas, disputa,
                    validação de respostas) e a lógica de visibilidade por
                    assento — não depende de rede, é só funções puras sobre
                    o objeto `room`
gameData.js       → dicionários e montagem do banco de desafios
public/           → cliente (HTML/CSS/JS), um "renderizador fino" que só
                    manda ações e desenha o que o servidor devolve
```

## Limitações da v1

- As configurações da sala (número de duplas, duração, nº de rodadas) só
  podem ser definidas na criação — não dá para mudar depois.
- Sem autenticação: quem tiver o código da sala consegue entrar. Ok para uso
  casual entre amigos.
- Reconexão automática usa `localStorage` no navegador: se limpar os dados
  do site, ao recarregar a página o jogador precisa entrar de novo com o
  código da sala.
- Salas sem nenhuma conexão ativa são apagadas da memória depois de 30
  minutos.
