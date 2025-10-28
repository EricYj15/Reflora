# ✅ CHECKLIST DE DEPLOY

Use esta lista para garantir que tudo está configurado corretamente.

---

## 📋 PRÉ-DEPLOY

### Preparação Local
- [ ] Copiei `.env.example` para `.env`
- [ ] Configurei `JWT_SECRET` (gerado com comando node)
- [ ] Testei localmente com `npm run dev`
- [ ] Login/cadastro funcionam localmente
- [ ] Produtos carregam corretamente
- [ ] Checkout funciona
- [ ] Painel admin acessível

### Código
- [ ] Todos arquivos commitados (exceto .env)
- [ ] `.gitignore` está correto
- [ ] Código funciona sem erros
- [ ] Não há console.logs desnecessários
- [ ] README atualizado

---

## 🚀 DEPLOY DO BACKEND

### Escolher Plataforma
- [ ] Railway OU
- [ ] Render OU
- [ ] Outra (especificar: _________)

### Railway (se escolheu)
- [ ] Conta criada em railway.app
- [ ] Repositório conectado
- [ ] Projeto criado: "reflora-backend"
- [ ] Start Command configurado: `node server/index.js`

### Render (se escolheu)
- [ ] Conta criada em render.com
- [ ] Web Service criado
- [ ] Build Command: `npm install`
- [ ] Start Command: `node server/index.js`

### Variáveis de Ambiente do Backend
Mínimo obrigatório:
- [ ] `JWT_SECRET` - Chave gerada (64+ caracteres)
- [ ] `PORT` - 4000 (ou automático)
- [ ] `ADMIN_EMAILS` - Seu email

Opcional (mas recomendado):
- [ ] `GOOGLE_CLIENT_ID` - Se usar login Google
- [ ] `RECAPTCHA_SECRET` - Se usar reCAPTCHA
- [ ] `PIX_KEY` - Se usar pagamento PIX
- [ ] `MP_ACCESS_TOKEN` - Se usar Mercado Pago
- [ ] `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Se usar email

### Teste do Backend
- [ ] Deploy concluído com sucesso
- [ ] URL do backend anotada: `___________________________`
- [ ] Teste: `https://seu-backend.app/api/health` retorna `{"status":"ok"}`
- [ ] Logs não mostram erros críticos

---

## 🌐 DEPLOY DO FRONTEND

### Vercel
- [ ] Conta criada/logada em vercel.com
- [ ] Projeto "reflora-zeta" (ou outro nome) existe
- [ ] Conectado ao repositório GitHub

### Variáveis de Ambiente do Frontend
Obrigatório:
- [ ] `REACT_APP_API_URL` = URL do backend (SEM `/` no final)

Opcional:
- [ ] `REACT_APP_GOOGLE_CLIENT_ID` - Se usar login Google
- [ ] `REACT_APP_RECAPTCHA_SITE_KEY` - Se usar reCAPTCHA

### Configuração Build
- [ ] Framework Preset: Create React App
- [ ] Build Command: `npm run build`
- [ ] Output Directory: `build`
- [ ] Root Directory: `./`

### Deploy
- [ ] Deploy executado
- [ ] Build concluído sem erros
- [ ] Sem warnings críticos
- [ ] URL do site anotada: `___________________________`

---

## 🧪 TESTES EM PRODUÇÃO

### Frontend
- [ ] Site abre sem erros
- [ ] Não há erros no Console (F12)
- [ ] Produtos carregam
- [ ] Imagens aparecem
- [ ] Animações funcionam
- [ ] Responsivo (mobile/tablet/desktop)

### Autenticação
- [ ] Modal de login abre
- [ ] Cadastro funciona
- [ ] Login funciona
- [ ] Token é salvo (localStorage)
- [ ] Logout funciona
- [ ] Login com Google funciona (se configurado)

### Funcionalidades
- [ ] Adicionar produto ao carrinho
- [ ] Abrir carrinho
- [ ] Atualizar quantidades
- [ ] Remover do carrinho
- [ ] Calcular frete por CEP
- [ ] Buscar endereço por CEP (ViaCEP)
- [ ] Preencher formulário de checkout
- [ ] Finalizar pedido
- [ ] QR Code PIX aparece (se configurado)
- [ ] Link Mercado Pago aparece (se configurado)

### Painel Admin
- [ ] URL: `https://seu-site.com/#admin` acessível
- [ ] Login como admin funciona
- [ ] Aba "Pedidos" mostra pedidos
- [ ] Aba "Catálogo" mostra produtos
- [ ] Criar novo produto funciona
- [ ] Upload de imagens funciona
- [ ] Editar produto funciona
- [ ] Excluir produto funciona

---

## 🔒 SEGURANÇA

### Backend
- [ ] `.env` NÃO está no Git
- [ ] `JWT_SECRET` é forte (64+ caracteres aleatórios)
- [ ] Banco de dados JSON NÃO está no Git
- [ ] CORS configurado com origins corretos
- [ ] Rate limiting considerado (futuro)

### Frontend
- [ ] Variáveis secretas estão apenas no Vercel
- [ ] Não há chaves de API no código fonte
- [ ] HTTPS habilitado (automático no Vercel)
- [ ] reCAPTCHA ativo (recomendado)

---

## 📱 INTEGRAÇÕES (Opcional)

### Google OAuth
- [ ] Projeto criado no Google Cloud Console
- [ ] Client ID gerado
- [ ] Origins autorizadas: Frontend + Backend
- [ ] Variável configurada no frontend e backend
- [ ] Login com Google testado

### reCAPTCHA
- [ ] Site registrado em google.com/recaptcha/admin
- [ ] Site Key e Secret Key gerados
- [ ] Variáveis configuradas (frontend e backend)
- [ ] Checkbox "I'm not a robot" aparece no cadastro
- [ ] Validação funciona

### PIX
- [ ] Chave PIX definida
- [ ] `PIX_KEY` configurada no backend
- [ ] Nome e cidade configurados
- [ ] QR Code gerado após pedido
- [ ] QR Code escaneável e funcional

### Mercado Pago
- [ ] Conta Mercado Pago criada
- [ ] Access Token gerado
- [ ] `MP_ACCESS_TOKEN` configurado
- [ ] URLs de success/failure configuradas
- [ ] Link de pagamento funciona
- [ ] Redireciona corretamente

### Email (SMTP)
- [ ] Serviço de email escolhido (Gmail, SendGrid, etc.)
- [ ] Credenciais SMTP configuradas
- [ ] `SMTP_FROM` definido
- [ ] Teste: Recuperação de senha envia email
- [ ] Email chega (verificar spam também)

---

## 📊 MONITORAMENTO

### Logs e Erros
- [ ] Acesso aos logs do Railway/Render configurado
- [ ] Acesso aos logs do Vercel configurado
- [ ] Não há erros críticos nos logs
- [ ] Alertas configurados (opcional)

### Performance
- [ ] Site carrega em menos de 3 segundos
- [ ] Imagens otimizadas (WebP, comprimidas)
- [ ] Lighthouse score > 80 (opcional)

### Backup
- [ ] Backup manual dos arquivos JSON feito
- [ ] Local de backup definido: ___________
- [ ] Frequência de backup definida: ___________

---

## 🎉 PÓS-DEPLOY

### Comunicação
- [ ] URL compartilhada com stakeholders
- [ ] Instruções de uso enviadas
- [ ] Credenciais admin compartilhadas (se necessário)

### Documentação
- [ ] README atualizado com URLs de produção
- [ ] Senhas e tokens documentados (local seguro)
- [ ] Procedimentos de emergência documentados

### Marketing
- [ ] Site adicionado ao Google Search Console
- [ ] Sitemap enviado
- [ ] Google Analytics configurado (opcional)
- [ ] Meta tags (OG, Twitter Card) configuradas
- [ ] Redes sociais atualizadas com link

---

## 🐛 SE ALGO DEU ERRADO

### Backend não responde
1. [ ] Verifique logs no Railway/Render
2. [ ] Confirme que variáveis estão corretas
3. [ ] Teste endpoint /api/health
4. [ ] Reinicie o serviço

### Frontend com erro
1. [ ] Verifique console do navegador (F12)
2. [ ] Confirme REACT_APP_API_URL está correto
3. [ ] Verifique logs de build no Vercel
4. [ ] Faça redeploy

### Login não funciona
1. [ ] Confirme JWT_SECRET está no backend
2. [ ] Verifique CORS no backend
3. [ ] Teste com conta nova
4. [ ] Limpe localStorage (F12 → Application → Clear)

### Outras issues
- [ ] Consultei FAQ.md
- [ ] Consultei DEPLOY.md
- [ ] Verifiquei logs de ambos os serviços
- [ ] Testei em modo anônimo/incógnito

---

## ✅ DEPLOY COMPLETO

Quando TODOS os itens obrigatórios estiverem marcados:

- [ ] **Backend online e funcionando**
- [ ] **Frontend online e funcionando**
- [ ] **Login/Cadastro funcionam**
- [ ] **Produtos carregam**
- [ ] **Checkout funciona**
- [ ] **Painel admin acessível**

---

## 🎊 PARABÉNS!

Seu site Reflora está no ar! 🚀🌸

**URLs em produção:**
- Frontend: `___________________________`
- Backend: `___________________________`
- Admin: `___________________________#admin`

**Próximos passos:**
1. Monitorar logs por 24-48h
2. Fazer backup dos dados
3. Coletar feedback de usuários
4. Planejar próximas features

---

**Data do deploy**: ___/___/___
**Responsável**: _____________
**Tempo total**: ______ horas
