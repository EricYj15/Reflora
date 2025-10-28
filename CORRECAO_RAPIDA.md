# 🔧 CORREÇÃO RÁPIDA - Login/Cadastro no Vercel

## ❌ Problema
Ao acessar https://reflora-zeta.vercel.app e tentar fazer login/cadastro, aparece:
**"Não foi possível processar a solicitação."**

## ✅ Causa
O frontend no Vercel não consegue se comunicar com o backend porque:
1. O backend não está hospedado (ainda está rodando só localmente)
2. A variável `REACT_APP_API_URL` não está configurada no Vercel

> 💡 **"Por que não posso hospedar tudo no Vercel?"**  
> Resposta completa: **[POR_QUE_NAO_VERCEL.md](POR_QUE_NAO_VERCEL.md)**

## 🚀 Solução em 3 Passos

### PASSO 1: Hospedar o Backend

⚠️ **Por que não posso hospedar tudo no Vercel?**

O Vercel é otimizado para sites estáticos e funções serverless (que executam rapidamente e encerram). Seu backend precisa de um servidor que fica **rodando continuamente** para:
- Manter o banco de dados JSON
- Gerenciar sessões de usuários
- Processar uploads de imagens

Por isso, você precisa de um serviço como Railway ou Render para o backend. **É grátis e leva 5 minutos!**

---

O backend (servidor Node.js) precisa estar online. Escolha uma opção:

#### Opção A: Railway (Mais Fácil e Rápido) ⭐
1. Acesse https://railway.app
2. Faça login com GitHub
3. Clique em **"New Project"** → **"Deploy from GitHub repo"**
4. Selecione seu repositório `Reflora-main`
5. Adicione estas variáveis de ambiente:
   ```
   JWT_SECRET=cole_aqui_uma_chave_aleatoria_longa
   PORT=4000
   ADMIN_EMAILS=reflorar123@gmail.com
   ```
   Para gerar JWT_SECRET, execute no terminal:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
6. Em **Settings** → **Start Command**, coloque:
   ```
   node server/index.js
   ```
7. Aguarde o deploy e **COPIE A URL** (ex: `https://reflora-production.up.railway.app`)

#### Opção B: Render
1. Acesse https://render.com
2. New → Web Service
3. Conecte GitHub e selecione o repo
4. Configure:
   - Build: `npm install`
   - Start: `node server/index.js`
5. Adicione as mesmas variáveis de ambiente acima
6. **COPIE A URL** gerada

---

### PASSO 2: Configurar o Frontend no Vercel

1. Acesse https://vercel.com/dashboard
2. Selecione seu projeto **reflora-zeta**
3. Vá em **Settings** → **Environment Variables**
4. Adicione esta variável:
   ```
   Name: REACT_APP_API_URL
   Value: https://sua-url-do-railway-ou-render.app
   ```
   ⚠️ **NÃO coloque `/` no final da URL**

5. Clique em **Save**

---

### PASSO 3: Fazer Rebuild no Vercel

1. No Vercel, vá em **Deployments**
2. Clique nos **3 pontos** no último deploy
3. Clique em **Redeploy**
4. Aguarde alguns minutos

---

## ✅ Teste

1. Acesse https://reflora-zeta.vercel.app
2. Clique em **Login** ou **Criar conta**
3. Tente fazer cadastro
4. Deve funcionar! 🎉

---

## 🐛 Se ainda não funcionar

### Verificar Backend:
Abra no navegador:
```
https://sua-url-do-backend.app/api/health
```
Deve mostrar: `{"status":"ok","timestamp":"..."}`

Se não mostrar nada ou der erro:
- Backend não está online
- Volte ao Railway/Render e verifique os logs

### Verificar Frontend:
1. Abra https://reflora-zeta.vercel.app
2. Pressione **F12** (Console do navegador)
3. Tente fazer login
4. Se aparecer erro tipo:
   - `ERR_NAME_NOT_RESOLVED` → Backend não está acessível
   - `CORS error` → Precisa configurar CORS no backend
   - `404` → Rota não existe ou backend não está rodando

### Configurar CORS (se necessário):

Se aparecer erro de CORS, edite `server/index.js`:

```javascript
// Adicione DEPOIS de const app = express();
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

## 📝 Resumo do que foi alterado

1. ✅ Criado arquivo `.env.example` com todas variáveis necessárias
2. ✅ Criado `src/utils/api.js` para centralizar chamadas da API
3. ✅ Atualizado `AuthContext.js` para usar `REACT_APP_API_URL`
4. ✅ Atualizado todos componentes para usar o novo sistema
5. ✅ Criado guia completo de deploy em `DEPLOY.md`

---

## 🎯 Próximos Passos (Opcional)

Depois que o login funcionar:

1. Configure Google OAuth (se quiser login com Google)
2. Configure reCAPTCHA (proteção contra bots)
3. Configure PIX/Mercado Pago (pagamentos)
4. Configure SMTP (recuperação de senha por email)

Todas as instruções estão no arquivo `DEPLOY.md` e `.env.example`.

---

**Boa sorte! 🚀**
