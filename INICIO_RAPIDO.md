# ⚡ INÍCIO RÁPIDO - 5 Minutos

**Objetivo**: Colocar o site Reflora funcionando em produção o mais rápido possível.

---

## 🎯 O Que Você Vai Fazer

1. Hospedar o backend no Railway (grátis)
2. Configurar a URL no Vercel
3. Testar o login

**Tempo total**: ~5-10 minutos

---

## ✅ PASSO 1: Backend (Railway)

### 1.1. Criar Conta
1. Acesse https://railway.app
2. Clique em **"Login"** → **"Login with GitHub"**
3. Autorize Railway no GitHub

### 1.2. Deploy
1. Clique em **"New Project"**
2. Clique em **"Deploy from GitHub repo"**
3. Selecione o repositório **Reflora-main**
4. Aguarde ~2 minutos (build automático)

### 1.3. Configurar Variáveis

1. Clique no projeto criado
2. Clique na aba **"Variables"**
3. Clique em **"+ New Variable"**
4. Adicione:

```
JWT_SECRET=sua_chave_aleatoria_aqui
```

**Como gerar JWT_SECRET**:
- Abra o terminal e execute:
  ```bash
  node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
  ```
- Copie o resultado e cole acima

5. Adicione mais variáveis (opcional mas recomendado):
```
ADMIN_EMAILS=seu@email.com
PORT=4000
```

### 1.4. Configurar Start Command

1. Vá em **"Settings"** (⚙️)
2. Role até **"Start Command"**
3. Digite: `node server/index.js`
4. Clique **"Save"**

### 1.5. Obter URL

1. Vá em **"Settings"** → **"Networking"**
2. Clique em **"Generate Domain"**
3. **COPIE A URL** gerada (ex: `reflora-production.up.railway.app`)

✅ **Backend pronto!**

---

## ⚙️ PASSO 2: Frontend (Vercel)

### 2.1. Acessar Projeto
1. Acesse https://vercel.com
2. Faça login
3. Selecione o projeto **reflora-zeta**

### 2.2. Adicionar Variável

1. Clique em **"Settings"** (topo)
2. Clique em **"Environment Variables"** (lateral)
3. Preencha:
   - **Name**: `REACT_APP_API_URL`
   - **Value**: `https://sua-url-do-railway.app` (cole a URL do passo 1.5)
   - **Environment**: Deixe todos marcados ✅
4. Clique em **"Save"**

### 2.3. Redeploy

1. Vá em **"Deployments"** (topo)
2. No primeiro deploy da lista, clique nos **3 pontos** (⋮)
3. Clique em **"Redeploy"**
4. Confirme: **"Redeploy"**
5. Aguarde ~2-3 minutos

✅ **Frontend pronto!**

---

## 🧪 PASSO 3: Testar

### 3.1. Verificar Backend
Abra no navegador:
```
https://sua-url-do-railway.app/api/health
```

**Deve mostrar**:
```json
{"status":"ok","timestamp":"..."}
```

❌ Se não mostrar → Volte ao Railway e verifique os logs

### 3.2. Verificar Frontend

1. Abra https://reflora-zeta.vercel.app
2. Pressione **F12** (Console)
3. Clique em **"Login"** ou **"Criar conta"**
4. Tente fazer cadastro
5. **Deve funcionar!** 🎉

---

## ❌ SE NÃO FUNCIONAR

### Erro no cadastro/login?

**Verifique**:
1. Backend está online? (`/api/health` retorna OK?)
2. `REACT_APP_API_URL` está correto no Vercel?
3. Fez redeploy no Vercel após adicionar variável?

**Teste direto**:
Abra o console (F12) → Network → Tente login → Veja qual URL está sendo chamada

**Deve ser**:
```
https://sua-url-railway.app/api/auth/login
```

**Se estiver**:
```
http://localhost:4000/api/auth/login   ❌ Errado!
```

**Solução**: Variável não foi configurada. Refaça Passo 2.

### Erro de CORS?

Edite `server/index.js` e adicione após `const app = express();`:

```javascript
app.use(cors({
  origin: [
    'https://reflora-zeta.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

Faça commit e push para atualizar.

---

## 🎉 PRONTO!

Seu site está funcionando! Agora você pode:

- ✅ Criar contas
- ✅ Fazer login
- ✅ Adicionar produtos ao carrinho
- ✅ Finalizar pedidos
- ✅ Acessar painel admin (com email em ADMIN_EMAILS)

---

## 📚 PRÓXIMOS PASSOS

Depois que tudo funcionar:

1. **Backup**: Faça backup do `server/db/*.json`
2. **Monitoramento**: Acompanhe logs do Railway e Vercel
3. **Integrações**: Configure Google OAuth, reCAPTCHA, PIX (veja [DEPLOY.md](DEPLOY.md))
4. **Otimização**: Comprima imagens, configure CDN

---

## 🆘 PRECISA DE MAIS AJUDA?

- 📄 [FAQ.md](FAQ.md) - Perguntas frequentes
- 📄 [DEPLOY.md](DEPLOY.md) - Guia completo
- 📄 [CHECKLIST_DEPLOY.md](CHECKLIST_DEPLOY.md) - Verificação

---

**Boa sorte!** 🚀🌸

**Tempo gasto**: ______ minutos
**Funcionou de primeira?** ☐ Sim ☐ Não
