# 🌸 Reflora - Moda que Floresce de Novo

Website oficial da **Reflora**, uma marca brasileira de moda upcycling que transforma peças esquecidas em obras de arte únicas.

## 🚨 PENDENTE: Configurar Webhook do Mercado Pago

**STATUS:** ⏳ **AGUARDANDO CONFIGURAÇÃO** 

### ❗ Por que é importante?
Sem o webhook configurado, o status dos pedidos **NÃO será atualizado automaticamente** após o pagamento. Os clientes ficarão com status "Aguardando Pagamento" mesmo depois de pagar.

### 📋 O que precisa fazer:
1. [ ] Fazer redeploy do backend no Railway/Render
2. [ ] Acessar painel do Mercado Pago
3. [ ] Configurar webhook: `https://SEU-BACKEND/api/webhooks/mercadopago`
4. [ ] Testar com pedido real

### 📖 Guia completo:
👉 **[Abra CONFIGURAR_WEBHOOK_MERCADOPAGO.md](CONFIGURAR_WEBHOOK_MERCADOPAGO.md)** - Passo a passo detalhado

---

## ⚠️ ATENÇÃO: Problema de Login/Cadastro Resolvido

Se você está acessando o site em produção (https://reflora-zeta.vercel.app) e está recebendo o erro **"Não foi possível processar a solicitação"** ao tentar fazer login ou cadastro:

### 🚨 CORREÇÃO RÁPIDA
👉 **[Abra CORRECAO_RAPIDA.md](CORRECAO_RAPIDA.md)** - Solução em 3 passos (5 minutos)

### 📚 DOCUMENTAÇÃO COMPLETA

| Você precisa... | Documento | Tempo |
|----------------|-----------|-------|
| 🚨 Corrigir erro de login | [CORRECAO_RAPIDA.md](CORRECAO_RAPIDA.md) | 3 min |
| ⚡ Configurar webhook MP | [CONFIGURAR_WEBHOOK_MERCADOPAGO.md](CONFIGURAR_WEBHOOK_MERCADOPAGO.md) | 10 min |
| 🚀 Fazer deploy completo | [DEPLOY.md](DEPLOY.md) | 30-60 min |
| ⚙️ Configurar Vercel | [CONFIGURACAO_VERCEL.md](CONFIGURACAO_VERCEL.md) | 5 min |
| ✅ Verificar deploy | [CHECKLIST_DEPLOY.md](CHECKLIST_DEPLOY.md) | 10 min |
| ❓ Tirar dúvidas | [FAQ.md](FAQ.md) | Varia |
| 📁 Ver estrutura | [ESTRUTURA_PROJETO.md](ESTRUTURA_PROJETO.md) | 5 min |
| 📖 Índice completo | [INDICE.md](INDICE.md) | 2 min |

**Resumo**: O backend precisa estar hospedado e a variável `REACT_APP_API_URL` precisa estar configurada no Vercel.

---

## ✨ Sobre o Projeto

Este é um site de lançamento desenvolvido com React.js que incorpora o conceito poético de "Flores Noturnas" - uma experiência imersiva que convida os visitantes a explorarem um jardim secreto digital à meia-noite, onde cada peça de roupa única desabrocha sob a luz das estrelas.

### 🎨 Características Principais

- **Fundo Estrelado Animado**: Canvas com partículas e efeito parallax
- **Hero Section**: Logo com animação de pulso orgânico e scroll suave
- **Grid de Produtos Assimétrico**: Layout masonry com animações de entrada
- **Modal de Produto Acessível**: Galeria de imagens com navegação por teclado
- **Conta Reflora & Login Seguro**: Cadastro com senha, acesso com token JWT e login social via Google
- **Cadastro Protegido por reCAPTCHA**: Bloqueia bots automatizados exigindo validação humana nas novas contas
- **Checkout com PIX**: Formulário completo que registra clientes, endereços e produtos e gera QR Code PIX automaticamente
- **Calculadora de Frete por CEP**: Consulta automática do valor e prazo estimado de entrega conforme a região do Brasil
- **Preenchimento automático de endereço**: Busca de logradouro, bairro, cidade e UF pelo CEP (ViaCEP) com possibilidade de ajuste manual
- **Painel de Cadastros**: Lista interna dos pedidos salvos em banco de dados local
- **Painel Administrativo**: Dashboard protegido para visão de pedidos e CRUD completo das peças
- **Gestão de Tamanhos PP/P/M/G**: Controle granular de disponibilidade diretamente no painel
- **Seção Garantia & Segurança**: Explica políticas de devolução, fluxo de pagamento e canais de suporte
- **Integração Mercado Pago**: Link seguro para cartões, boleto e saldo direto da plataforma
- **Webhook Automático MP**: Atualiza status dos pedidos automaticamente após pagamento ✨ NOVO
- **Manifesto Poético**: Seção narrativa centralizada
- **Footer Interativo**: Formulário de contato integrado com Formspree
- **Design Responsivo**: Mobile-first com adaptação para todos os dispositivos

## 🎨 Paleta de Cores

- **Fundo Principal**: Azul Crepúsculo `#5F8A8B`
- **Ação e Destaque**: Vermelho Terra `#9A1B1E`
- **Texto Principal**: Branco Estelar `#F5F5DC`
- **Detalhes Mágicos**: Dourado Antigo `#D4AF37`

## 📂 Estrutura do Projeto

```
server/
├── index.js          # API Express com endpoints de pedidos, frete e geração PIX
└── db/
  ├── orders.json   # Banco de dados JSON persistente
  ├── users.json    # Cadastro de usuários
  └── products.json # Catálogo de produtos sincronizado com o painel admin

src/
├── components/
│   ├── Auth/
│   │   ├── AuthModal.js
│   │   └── AuthModal.module.css
│   ├── Checkout/
│   │   ├── Checkout.js
│   │   └── Checkout.module.css
│   ├── SecurePurchase/
│   │   ├── SecurePurchase.js
│   │   └── SecurePurchase.module.css
│   ├── StarryBackground/
│   │   ├── StarryBackground.js
│   │   └── StarryBackground.module.css
│   ├── Hero/
│   │   ├── Hero.js
│   │   └── Hero.module.css
│   ├── ProductGrid/
│   │   ├── ProductGrid.js
│   │   └── ProductGrid.module.css
│   ├── ProductModal/
│   │   ├── ProductModal.js
│   │   └── ProductModal.module.css
│   ├── Manifesto/
│   │   ├── Manifesto.js
│   │   └── Manifesto.module.css
│   └── ContactFooter/
│       ├── ContactFooter.js
│       └── ContactFooter.module.css
├── data/
│   └── products.js
├── context/
│   └── AuthContext.js
├── pages/
│   ├── AdminDashboard/
│   │   ├── AdminDashboard.js
│   │   └── AdminDashboard.module.css
│   ├── CheckoutPage.js
│   └── HomePage.js
├── App.js
├── App.css
├── index.js
└── index.css
```

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm ou yarn

### Instalação

1. Clone o repositório ou navegue até a pasta do projeto:
```bash
cd reflora-site
```

2. Copie o arquivo de variáveis de ambiente e ajuste conforme necessário:
```bash
cp .env.example .env
```

3. Instale as dependências:
```bash
npm install
```

### Executando Localmente

Para iniciar o servidor de desenvolvimento completo (frontend + API):

```bash
npm run dev
```

- API disponível em [http://localhost:4000](http://localhost:4000)
- Site disponível em [http://localhost:3000](http://localhost:3000)

Se preferir iniciar apenas a aplicação React:

```bash
npm start
```

E apenas a API:

```bash
npm run server
```

### Build para Produção

Para criar uma versão otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `build/`.

## 🔧 Configurações Necessárias

### Integração com Formspree

Para ativar o formulário de contato:

1. Crie uma conta em [Formspree.io](https://formspree.io/)
2. Crie um novo formulário e obtenha seu endpoint
3. Substitua `SEU_FORMSPREE_ID` no arquivo `src/components/ContactFooter/ContactFooter.js`:

```javascript
action="https://formspree.io/f/SEU_FORMSPREE_ID"
```

### Links de Redes Sociais

Atualize os links das redes sociais no arquivo `src/components/ContactFooter/ContactFooter.js`:

```javascript
href="https://instagram.com/seu_perfil"
href="https://facebook.com/sua_pagina"
href="https://pinterest.com/seu_perfil"
```

### Catálogo de produtos

- O catálogo carregado na vitrine vem do endpoint `GET /api/products`. Se a API não estiver disponível, o app utiliza o fallback local `src/data/products.js`.
- A forma recomendada de atualizar as peças é pelo painel administrativo (rota `/admin`), onde é possível adicionar, editar ou remover itens.
- Caso prefira edição manual, atualize o arquivo persistido `server/db/products.json` mantendo a estrutura JSON (o backend recarrega esse arquivo a cada alteração via painel).

### Configuração do PIX

1. Copie o arquivo `.env.example` para `.env` na raiz do projeto.
2. Informe sua chave PIX (`PIX_KEY`), nome e cidade do titular.
3. Execute novamente `npm run server` ou `npm run dev` para que as configurações sejam carregadas.
4. Após gerar um pedido, o QR Code PIX aparecerá automaticamente na interface.

### Calculadora de frete por CEP

- O botão **“Calcular frete”** da página de checkout utiliza o endpoint `POST /api/shipping/quote` para estimar valor e prazo com base nos primeiros dígitos do CEP.
- As regras padrão são regionais e consideram o número de itens no carrinho:

  | Região / Prefixo | Base (R$) | Adicional por item (R$) | Prazo estimado |
  | ---------------- | --------- | ------------------------ | --------------- |
  | Sudeste – SP (0) | 18,90     | 4,50                     | 2 a 3 dias úteis |
  | Sudeste – RJ/ES (1) | 21,90  | 4,90                     | 2 a 4 dias úteis |
  | Sudeste – MG (2) | 21,90     | 5,20                     | 2 a 4 dias úteis |
  | Nordeste – BA/SE (3) | 26,90 | 6,20                     | 3 a 6 dias úteis |
  | Nordeste – PE/AL/PB/RN (4) | 27,90 | 6,50             | 4 a 7 dias úteis |
  | Nordeste – CE/PI/MA (5) | 29,90 | 6,90                 | 4 a 8 dias úteis |
  | Centro-Oeste – DF/GO/TO/MT/MS (6) | 32,90 | 7,40       | 3 a 6 dias úteis |
  | Sul – PR/SC (7) | 23,90      | 5,20                     | 3 a 5 dias úteis |
  | Sul – RS (8) | 24,90         | 5,40                     | 3 a 5 dias úteis |
  | Norte – AC/AM/PA/RR/AP/RO (9) | 38,90 | 8,90          | 5 a 9 dias úteis |

- Para personalizar o cálculo, edite a constante `SHIPPING_RULES` em `server/index.js`.
- O custo final enviado para o pedido já inclui o frete; o histórico do painel exibe o valor do frete em cada cadastro.
- O campo de CEP do checkout consome automaticamente a API pública do [ViaCEP](https://viacep.com.br/) para preencher rua, bairro, cidade e UF; o usuário pode ajustar manualmente os dados antes de fechar o pedido.
- Após localizar o endereço, o frete é recalculado automaticamente sempre que o carrinho sofre alterações ou o CEP é atualizado.

### Ajuste da política de garantia

- Personalize a seção "Compra tranquila" no componente `SecurePurchase` com seus dados reais (prazo de devolução, canais oficiais, horário de atendimento).
- Atualize o contato do WhatsApp e e-mail exibidos na mesma seção.
- Opcional: adicione seu CNPJ, endereço fiscal e link para termos completos no footer.

### Rastreamento Correios (produção)

- O endpoint `GET /api/tracking/:trackingCode` agora consulta diretamente os Correios (ProxyApp oficial) em produção e mantém um cache em memória para reduzir rate-limit.
- Configure as variáveis no backend (Railway/Render):
  - `TRACKING_PROVIDER=correios` (padrão)
  - `TRACKING_CACHE_TTL_SECONDS=300` (ou outro intervalo em segundos)
  - `TRACKING_USER_AGENT=RefloraBackend/1.0` (opcional, porém recomendado para identificação)
  - Se preferir a API Linketrack, defina `TRACKING_PROVIDER=linketrack`, `LINKETRACK_USER` e `LINKETRACK_TOKEN`.
  - Para ambiente de testes sem consulta externa, use `TRACKING_PROVIDER=mock` ou `TRACKING_FALLBACK_TO_MOCK=true`.
- A resposta normalizada inclui `code`, `service` e `events` (descendentes por data). Caso os Correios ainda não tenham eventos, retornará 404 com mensagem amigável.

### Mercado Pago (cartão, boleto e saldo)
### Autenticação (JWT + Google + reCAPTCHA)

1. Copie `.env.example` para `.env` e configure:
  - `SERVER_PORT`: porta do backend Express (padrão `4000`). Não defina `PORT`, pois essa variável é usada pelo servidor React.
  - `DANGEROUSLY_DISABLE_HOST_CHECK`: defina `true` para liberar o host no webpack-dev-server (CRA 5).
  - `JWT_SECRET`: chave secreta utilizada para assinar os tokens do usuário (obrigatória).
  - `JWT_EXPIRATION`: tempo de expiração do token (padrão `7d`).
  - `GOOGLE_CLIENT_ID`: Client ID OAuth obtido no [Google Cloud Console](https://console.cloud.google.com/).
2. Também defina `REACT_APP_GOOGLE_CLIENT_ID` com o mesmo valor para habilitar o botão de login no frontend.
3. Gere um site key e um secret key no [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin) utilizando a opção **reCAPTCHA v2 – Checkbox "I'm not a robot"**.
4. Configure as variáveis de ambiente do CAPTCHA:
  - Backend: `RECAPTCHA_SECRET` **ou** `RECAPTCHA_SECRET_KEY` (Secret key obtido no console do Google).
  - Frontend: `REACT_APP_RECAPTCHA_SITE_KEY` (Site key obtido no console do Google).
5. Configure o envio de e-mail para o fluxo de redefinição de senha (SMTP):
  - `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`
  - `SMTP_USER`, `SMTP_PASS`
  - `SMTP_FROM`: remetente exibido para o usuário (ex.: `"Reflora <no-reply@reflora.com>"`).
  - Ajuste, se necessário, `RESET_TOKEN_EXPIRATION_MINUTES`, `RESET_MAX_ATTEMPTS` e `RESET_REQUEST_COOLDOWN_MINUTES`.
  - Ambiente de desenvolvimento: se o SMTP não estiver configurado, o código é exibido no log do servidor para facilitar testes.
6. Reinicie o servidor e o app (`npm run dev`) após alterar o `.env`.
7. Usuários criados via email/senha são armazenados em `server/db/users.json` com senha criptografada (bcrypt).
8. Para redefinir o ambiente, limpe o arquivo `users.json` (não remova a chave `users`).

### Recuperação de senha

1. No modal de autenticação, o usuário escolhe **“Esqueci minha senha”** e informa o e-mail cadastrado.
2. O sistema exige a validação do reCAPTCHA e envia um código de verificação de 6 dígitos por e-mail (`POST /api/auth/reset-password/request`).
3. Com o código em mãos, o usuário informa o código + nova senha + confirmação (+ reCAPTCHA) para concluir (`POST /api/auth/reset-password/confirm`).
4. O backend armazena temporariamente o hash do código, respeitando:
  - Expiração configurável (`RESET_TOKEN_EXPIRATION_MINUTES`, padrão 15 minutos)
  - Limite de tentativas (`RESET_MAX_ATTEMPTS`, padrão 5)
  - Intervalo mínimo entre solicitações (`RESET_REQUEST_COOLDOWN_MINUTES`, padrão 2 minutos)
5. Depois da confirmação, a senha é atualizada com hash bcrypt e o token é invalidado. Contas sem senha local (apenas Google) precisam primeiro definir uma senha pelo painel administrativo.
6. Se o SMTP não estiver configurado, o código é registrado no log do backend para facilitar testes em ambiente de desenvolvimento.

### Acesso administrativo

- Defina a variável `ADMIN_EMAILS` no arquivo `.env` do backend com a lista de e-mails (separados por vírgula) que devem ter privilégios de administrador. Exemplo:

  ```env
  ADMIN_EMAILS=reflora123@gmail.com,contato@reflora.com
  ```

- Faça login com qualquer um desses e-mails (via cadastro tradicional ou Google). O header exibirá um selo **Admin** e o link "Painel" leva para `/admin`, onde é possível gerenciar pedidos e o catálogo.
- As ações de criar, editar ou remover produtos são protegidas pelo backend, exigindo token JWT com perfil admin.


1. Gere um **Access Token** no painel Mercado Pago (Menu Desenvolvedores > Credenciais).
2. Copie `.env.example` para `.env` e preencha `MP_ACCESS_TOKEN` com o token gerado.
3. (Opcional) Configure `MP_SUCCESS_URL`, `MP_FAILURE_URL` e `MP_NOTIFICATION_URL` para personalizar redirecionamentos/notificação.
4. Reinicie o servidor (`npm run server` ou `npm run dev`). Após salvar um pedido no checkout, aparecerá o botão “Abrir pagamento Mercado Pago”.

## 🎯 Funcionalidades Técnicas

- **React Hooks**: useState, useEffect, useRef para gerenciamento de estado
- **CSS Modules**: Estilos encapsulados por componente
- **Intersection Observer**: Animações de scroll detectadas automaticamente
- **Canvas API**: Animação de partículas do fundo estrelado
- **API Express**: Endpoints REST para cadastro e consulta de pedidos
- **Persistência em Arquivo**: Banco leve em JSON para guardar cadastros
- **Geração de QR Code PIX**: Payload conforme padrão BACEN em tempo real
- **Acessibilidade**: 
  - HTML semântico
  - Navegação por teclado
  - ARIA labels
  - Focus management

## 📱 Responsividade

O site é otimizado para:
- Smartphones (320px+)
- Tablets (768px+)
- Desktops (1024px+)
- Telas grandes (1440px+)

## 🌟 Créditos

**Design & Development**: Projeto desenvolvido com foco em arte digital e experiência do usuário.

**Fontes**:
- Lora (Google Fonts) - Títulos
- Montserrat (Google Fonts) - Corpo de texto

**Imagens**: Unsplash (substituir com imagens reais dos produtos)

## 📄 Licença

© 2025 Reflora. Todos os direitos reservados.

---

**Desenvolvido com ❤️ e consciência ambiental**
