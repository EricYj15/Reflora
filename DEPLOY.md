# 🚀 Guia de Deploy - Reflora

Este guia explica como fazer o deploy da aplicação Reflora em produção, separando o frontend (React) e o backend (Node.js/Express).

## 📋 Pré-requisitos

- Conta no [Vercel](https://vercel.com) (para o frontend)
- Conta no [Railway](https://railway.app), [Render](https://render.com) ou similar (para o backend)
- Git configurado
- Node.js instalado localmente

---

## 🎨 Parte 1: Deploy do Backend

O backend precisa estar hospedado e acessível antes do frontend.

### Opção A: Deploy no Railway (Recomendado)

1. **Acesse [Railway.app](https://railway.app)** e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Autorize e selecione seu repositório
5. Configure as variáveis de ambiente:
   - Clique em **"Variables"**
   - Adicione TODAS as variáveis do arquivo `.env.example`
   - **OBRIGATÓRIO**: `JWT_SECRET` (gere uma chave segura)
   - Exemplo de geração: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
   - **Produção Correios**: defina `TRACKING_PROVIDER=correios` e, opcionalmente, `TRACKING_CACHE_TTL_SECONDS` e `TRACKING_USER_AGENT`
   - **Caso utilize Linketrack**: adicione `TRACKING_PROVIDER=linketrack`, `LINKETRACK_USER` e `LINKETRACK_TOKEN`

6. **Configure o comando de start:**
   - No painel do Railway, vá em **Settings**
   - Em **"Start Command"**, adicione: `node server/index.js`
   - Em **"Root Directory"**, deixe vazio (ou `/` se necessário)

7. **Defina a porta:**
   - Adicione a variável `PORT=4000` (ou use a variável que o Railway fornece automaticamente)

8. **Deploy:**
   - O Railway fará o deploy automaticamente
   - Anote a URL gerada (ex: `https://reflora-production.up.railway.app`)

### Opção B: Deploy no Render

1. Acesse [Render.com](https://render.com)
2. Clique em **"New +"** → **"Web Service"**
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: reflora-backend
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Plan**: Free (ou superior)

5. Adicione as variáveis de ambiente (igual ao Railway)
6. Clique em **"Create Web Service"**
7. Anote a URL gerada

---

## 🌐 Parte 2: Deploy do Frontend no Vercel

### 2.1. Configurar Variáveis de Ambiente

No painel do Vercel:

1. Vá em **Settings** → **Environment Variables**
2. Adicione a variável:
   ```
   REACT_APP_API_URL=https://seu-backend.railway.app
   ```
   (Substitua pela URL real do seu backend)

3. **IMPORTANTE**: Adicione também as outras variáveis do frontend:
   ```
   REACT_APP_GOOGLE_CLIENT_ID=seu_google_client_id
   REACT_APP_RECAPTCHA_SITE_KEY=sua_chave_recaptcha
   ```

### 2.2. Deploy no Vercel

**Opção 1: Via Interface Web (Mais Fácil)**

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Import Project"**
3. Selecione seu repositório GitHub
4. Configure:
   - **Framework Preset**: Create React App
   - **Root Directory**: `./` (raiz do projeto)
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`

5. Adicione as variáveis de ambiente (passo 2.1)
6. Clique em **"Deploy"**

**Opção 2: Via CLI**

```bash
# Instale o Vercel CLI
npm install -g vercel

# Faça login
vercel login

# Na pasta do projeto, execute:
vercel

# Siga as instruções e configure as variáveis quando solicitado

# Para deploy de produção:
vercel --prod
```

### 2.3. Configurar CORS no Backend

Depois do deploy do frontend, adicione a URL do Vercel às configurações de CORS no backend.

Edite `server/index.js` e configure o CORS:

```javascript
app.use(cors({
  origin: [
    'https://reflora-zeta.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

Faça commit e push para atualizar o backend.

---

## ✅ Verificação

### Teste o Backend:
```bash
curl https://seu-backend.railway.app/api/health
```
Deve retornar: `{"status":"ok","timestamp":"..."}`

### Teste o Frontend:
1. Acesse `https://reflora-zeta.vercel.app`
2. Tente fazer login/cadastro
3. Verifique se os produtos carregam
4. Teste o checkout

---

## 🐛 Solução de Problemas

### Erro: "Não foi possível processar a solicitação"

**Causa**: Frontend não consegue acessar o backend.

**Solução**:
1. Verifique se `REACT_APP_API_URL` está configurada no Vercel
2. Confirme que o backend está online (acesse `/api/health`)
3. Verifique o CORS no backend
4. Reconstrua o frontend no Vercel: `Deployments` → `...` → `Redeploy`

### Erro 401: "Token inválido"

**Causa**: `JWT_SECRET` não está configurado no backend.

**Solução**:
1. Adicione `JWT_SECRET` nas variáveis do Railway/Render
2. Gere uma chave: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`

### Login com Google não funciona

**Causa**: `GOOGLE_CLIENT_ID` não está configurado corretamente.

**Solução**:
1. Configure tanto no frontend (`REACT_APP_GOOGLE_CLIENT_ID`) quanto no backend (`GOOGLE_CLIENT_ID`)
2. Adicione as URLs autorizadas no Google Console:
   - Origins: `https://reflora-zeta.vercel.app`
   - Redirects: `https://reflora-zeta.vercel.app`

### Produtos não carregam

**Causa**: Database vazia ou API não responde.

**Solução**:
1. Acesse o painel admin: `https://reflora-zeta.vercel.app/#admin`
2. Verifique se há produtos cadastrados
3. Verifique os logs do backend

---

## 📝 Variáveis de Ambiente - Checklist

### Frontend (Vercel)
- [ ] `REACT_APP_API_URL` - **OBRIGATÓRIO**
- [ ] `REACT_APP_GOOGLE_CLIENT_ID` - Opcional
- [ ] `REACT_APP_RECAPTCHA_SITE_KEY` - Opcional

### Backend (Railway/Render)
- [ ] `JWT_SECRET` - **OBRIGATÓRIO**
- [ ] `PORT` - **OBRIGATÓRIO** (Railway usa automaticamente)
- [ ] `ADMIN_EMAILS` - Recomendado
- [ ] `GOOGLE_CLIENT_ID` - Se usar login Google
- [ ] `RECAPTCHA_SECRET` - Se usar reCAPTCHA
- [ ] `PIX_KEY` - Se usar pagamento PIX
- [ ] `MP_ACCESS_TOKEN` - Se usar Mercado Pago
- [ ] `SMTP_*` - Se usar recuperação de senha por email
- [ ] `TRACKING_PROVIDER` - Produção (padrão `correios`)
- [ ] `LINKETRACK_USER`/`LINKETRACK_TOKEN` - Se optar por `TRACKING_PROVIDER=linketrack`
- [ ] `TRACKING_CACHE_TTL_SECONDS` - Opcional (cache do rastreio)

---

## 🔄 Atualizações Futuras

Para atualizar o projeto após fazer alterações:

### Frontend:
1. Faça push para o GitHub
2. O Vercel fará deploy automático
3. Ou force: `vercel --prod`

### Backend:
1. Faça push para o GitHub
2. Railway/Render fará deploy automático
3. Ou force manualmente pelo painel

---

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no painel do Railway/Render e Vercel
2. Teste os endpoints diretamente com `curl` ou Postman
3. Verifique o console do navegador (F12) para erros
4. Confirme que todas as variáveis de ambiente estão configuradas

---

## 🎉 Deploy Concluído!

Seu site estará acessível em:
- **Frontend**: https://reflora-zeta.vercel.app
- **Backend**: https://seu-backend.railway.app

Lembre-se de atualizar os links de pagamento e notificações (Mercado Pago) com as URLs de produção!
