# ⚙️ CONFIGURAÇÃO DO VERCEL - Passo a Passo com Imagens

## 🎯 Objetivo
Configurar a variável `REACT_APP_API_URL` no Vercel para que o frontend consiga se comunicar com o backend.

---

## 📍 ANTES DE COMEÇAR

Você **PRECISA** ter o backend hospedado primeiro. Se ainda não fez isso, volte ao `CORRECAO_RAPIDA.md` e complete o PASSO 1.

A URL do backend será algo como:
- Railway: `https://reflora-production.up.railway.app`
- Render: `https://reflora-backend.onrender.com`

---

## 🔧 Configurando no Vercel

### 1. Acessar o Dashboard do Vercel

1. Vá para https://vercel.com
2. Faça login (se ainda não estiver logado)
3. Você verá uma lista dos seus projetos

### 2. Selecionar o Projeto Reflora

1. Clique no projeto **reflora-zeta** (ou o nome que você deu)
2. Você será levado para a página de overview do projeto

### 3. Acessar as Configurações

1. No topo da página, clique na aba **Settings**
2. No menu lateral esquerdo, clique em **Environment Variables**

### 4. Adicionar a Variável de Ambiente

1. Você verá um formulário com três campos:
   - **Name** (Nome da variável)
   - **Value** (Valor da variável)
   - **Environment** (Onde será usada)

2. Preencha:
   ```
   Name: REACT_APP_API_URL
   Value: https://sua-url-do-backend.up.railway.app
   ```
   ⚠️ **IMPORTANTE**: 
   - NÃO coloque `/` no final da URL
   - Use a URL COMPLETA do seu backend (incluindo https://)
   - Não adicione `/api` no final

3. Em **Environment**, deixe marcado:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Clique no botão **Add** ou **Save**

### 5. Fazer Redeploy

Depois de adicionar a variável, você precisa reconstruir o site:

1. Volte para a página inicial do projeto (clique no logo do Vercel ou no nome do projeto)
2. Clique na aba **Deployments**
3. Você verá uma lista dos deploys anteriores
4. No deploy mais recente (primeiro da lista), clique no botão com **3 pontos verticais** (⋮)
5. Clique em **Redeploy**
6. Uma mensagem aparecerá perguntando se quer usar o mesmo código - clique **Redeploy**
7. Aguarde 2-3 minutos até o build terminar

### 6. Testar

1. Após o deploy terminar, clique em **Visit** para abrir o site
2. Ou acesse diretamente: https://reflora-zeta.vercel.app
3. Tente fazer login ou cadastro
4. Deve funcionar! 🎉

---

## 🔍 Verificar se a Variável Está Configurada

Para confirmar que a variável foi adicionada corretamente:

1. Vá em **Settings** → **Environment Variables**
2. Você deve ver:
   ```
   REACT_APP_API_URL
   https://sua-url-do-backend.up.railway.app
   Production, Preview, Development
   ```

3. Se quiser editar, clique no botão **Edit** ao lado
4. Se quiser remover, clique em **Remove**

---

## ❓ Outras Variáveis Opcionais

Se quiser adicionar login com Google ou reCAPTCHA, adicione também:

### Google OAuth
```
Name: REACT_APP_GOOGLE_CLIENT_ID
Value: seu-google-client-id.apps.googleusercontent.com
```

### reCAPTCHA
```
Name: REACT_APP_RECAPTCHA_SITE_KEY
Value: 6LcXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## 🐛 Solução de Problemas

### "As variáveis não estão funcionando"
- Certifique-se de fazer **Redeploy** após adicionar variáveis
- Variáveis de ambiente só são aplicadas durante o build, não em tempo real

### "Ainda aparece o erro"
1. Abra o Console do navegador (F12)
2. Vá na aba **Network**
3. Tente fazer login
4. Procure por chamadas para `/api/auth/login`
5. Clique na chamada e veja:
   - **Request URL**: Deve estar apontando para seu backend
   - **Status**: Se for 404, o backend não está respondendo
   - **Response**: Veja a mensagem de erro

### "Como ver os logs do build?"
1. Vá em **Deployments**
2. Clique no deploy em andamento ou concluído
3. Role a página e veja o **Build Logs**
4. Procure por erros ou avisos

---

## ✅ Checklist Final

Antes de considerar tudo resolvido, confirme:

- [ ] Backend está online e acessível (teste em `https://seu-backend.app/api/health`)
- [ ] Variável `REACT_APP_API_URL` está configurada no Vercel
- [ ] Redeploy foi feito após adicionar a variável
- [ ] Deploy foi concluído com sucesso (status verde)
- [ ] Site carrega sem erros no console
- [ ] Login/cadastro funciona sem erros

---

## 📞 Precisa de Ajuda?

Se ainda tiver problemas:

1. Verifique os logs do backend (Railway/Render)
2. Verifique os logs do frontend (Vercel → Deployments → seu deploy → View Build Logs)
3. Abra o console do navegador (F12) e procure por erros
4. Teste diretamente o backend com:
   ```bash
   curl https://seu-backend.app/api/health
   ```

---

**Boa sorte! 🚀**
