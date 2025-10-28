# ❓ FAQ - Perguntas Frequentes

## 🔴 Problemas com Login/Cadastro

### P: Por que aparece "Não foi possível processar a solicitação"?

**R**: O frontend não está conseguindo se comunicar com o backend. Isso acontece porque:
1. O backend não está hospedado/online
2. A variável `REACT_APP_API_URL` não está configurada no Vercel
3. O CORS não está configurado corretamente no backend

**Solução**: Veja `CORRECAO_RAPIDA.md`

---

### P: Posso hospedar tudo no Vercel?

**R**: Não recomendado. O Vercel é otimizado para frontend estático/serverless. O backend precisa de:
- Servidor rodando continuamente
- Armazenamento persistente para banco de dados JSON
- Processamento de uploads de imagens

Use Vercel para frontend e Railway/Render para backend (ambos grátis).

**Explicação detalhada**: Veja **[POR_QUE_NAO_VERCEL.md](POR_QUE_NAO_VERCEL.md)**

---

### P: Onde preciso hospedar o backend?

**R**: O backend (servidor Node.js) precisa estar em um serviço de hospedagem como:
- **Railway** (recomendado - grátis e fácil)
- **Render** (alternativa grátis)
- **Heroku** (pago)
- **DigitalOcean**, **AWS**, **Azure** (avançado)

NÃO pode ficar no Vercel, pois o Vercel é otimizado para frontend/serverless.

---

### P: Como gero o JWT_SECRET?

**R**: Execute este comando no terminal:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copie o resultado e use como valor de `JWT_SECRET`.

---

### P: O que é REACT_APP_API_URL?

**R**: É a variável que informa ao frontend onde está o backend. Exemplo:
```
REACT_APP_API_URL=https://reflora-backend.railway.app
```

⚠️ Não coloque `/` no final!

---

## 🌐 Deploy e Hospedagem

### P: Posso hospedar tudo no Vercel?

**R**: Não recomendado. O Vercel é otimizado para frontend estático. O backend precisa de:
- Execução contínua de servidor Node.js
- Armazenamento persistente para banco de dados JSON
- Processamento de uploads de imagens

Use Vercel para frontend e Railway/Render para backend.

---

### P: Quanto custa hospedar?

**R**: 
- **Frontend (Vercel)**: Grátis (plano Hobby)
- **Backend (Railway)**: Grátis até $5/mês de uso
- **Backend (Render)**: Grátis (com limitações)

Total: **R$ 0,00** para começar!

---

### P: Preciso de um domínio próprio?

**R**: Não! Tanto Vercel quanto Railway fornecem URLs gratuitas:
- Frontend: `https://reflora-zeta.vercel.app`
- Backend: `https://reflora-production.up.railway.app`

Se quiser domínio próprio (reflora.com.br), pode configurar depois.

---

## 🔒 Segurança e Configuração

### P: Onde coloco as variáveis de ambiente?

**R**:
- **Frontend**: Painel do Vercel → Settings → Environment Variables
- **Backend**: Painel do Railway/Render → Variables
- **Local**: Arquivo `.env` na raiz do projeto (não commitar!)

---

### P: Posso commitar o arquivo .env?

**R**: ❌ **NUNCA!** O `.env` contém senhas e chaves secretas. Use:
- `.env.example` - template sem valores reais (pode commitar)
- `.env` - arquivo real com senhas (nunca commitar)

O `.gitignore` já protege isso.

---

### P: Como proteger o painel administrativo?

**R**: O painel já está protegido! Apenas usuários com email listado em `ADMIN_EMAILS` têm acesso. Configure:
```env
ADMIN_EMAILS=seu@email.com,outro@email.com
```

---

## 💳 Pagamentos

### P: Preciso configurar PIX e Mercado Pago?

**R**: São opcionais! Configure se quiser aceitar pagamentos:
- **PIX**: Grátis, precisa apenas da chave PIX
- **Mercado Pago**: Taxa de ~4%, precisa de conta e token

Pode começar sem pagamentos e adicionar depois.

---

### P: Como funciona o PIX?

**R**: 
1. Cliente finaliza pedido
2. Sistema gera QR Code automático
3. Cliente escaneia e paga
4. Você recebe notificação no email/banco

---

### P: Mercado Pago vale a pena?

**R**: Sim se você quer:
- Aceitar cartões de crédito/débito
- Boleto bancário
- Parcelamento
- Checkout seguro fora do seu site

---

## 📧 Email e Comunicação

### P: Preciso configurar SMTP?

**R**: Não obrigatório, mas recomendado para:
- Recuperação de senha
- Notificações de pedidos
- Confirmações de cadastro

Use Gmail, SendGrid, Mailgun, etc.

---

### P: Como uso o Gmail para SMTP?

**R**: 
1. Ative autenticação de 2 fatores no Gmail
2. Gere uma "Senha de App" em https://myaccount.google.com/apppasswords
3. Configure no `.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu@gmail.com
SMTP_PASS=senha_de_app_gerada
SMTP_FROM=Reflora <seu@gmail.com>
```

---

## 🐛 Problemas Comuns

### P: "CORS error" no console

**R**: Configure CORS no backend (`server/index.js`):
```javascript
app.use(cors({
  origin: [
    'https://reflora-zeta.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true
}));
```

---

### P: "Invalid token" ou "Token expirado"

**R**: 
1. Verifique se `JWT_SECRET` está configurado no backend
2. Faça logout e login novamente
3. Limpe localStorage do navegador (F12 → Application → Clear)

---

### P: Produtos não carregam

**R**: 
1. Verifique se o backend está online: `https://seu-backend.app/api/health`
2. Verifique se `REACT_APP_API_URL` está correto
3. Acesse o painel admin e cadastre produtos

---

### P: Upload de imagens falha

**R**: 
1. Verifique tamanho (máx 5MB por imagem)
2. Use apenas formatos: JPG, PNG, GIF, WebP
3. Confirme que está logado como admin

---

## 🎨 Personalização

### P: Como mudar cores/fontes?

**R**: Edite:
- Cores: `src/index.css` (variáveis CSS no `:root`)
- Fontes: `public/index.html` (Google Fonts)
- Componentes: Arquivos `.module.css` de cada componente

---

### P: Como adicionar mais produtos?

**R**: 
1. Acesse `https://seu-site.com/#admin`
2. Vá na aba "Catálogo"
3. Clique em "Nova peça"
4. Preencha e salve

Ou edite manualmente `server/db/products.json`.

---

### P: Como mudar textos do site?

**R**: Edite os componentes em `src/components/`:
- Hero: `Hero/Hero.js`
- Manifesto: `Manifesto/Manifesto.js`
- Footer: `ContactFooter/ContactFooter.js`

---

## 📊 Dados e Backup

### P: Onde ficam os pedidos/usuários?

**R**: Em arquivos JSON:
- `server/db/orders.json` - Pedidos
- `server/db/users.json` - Usuários
- `server/db/products.json` - Catálogo

⚠️ Faça backup regularmente!

---

### P: Como fazer backup?

**R**: 
1. Acesse o painel do Railway/Render
2. Baixe os arquivos da pasta `server/db/`
3. Guarde em local seguro (Google Drive, Dropbox, etc.)

Ou configure backup automático via script.

---

### P: Posso migrar para banco de dados real?

**R**: Sim! Futuramente pode migrar para:
- **PostgreSQL** (Railway oferece grátis)
- **MongoDB** (MongoDB Atlas grátis)
- **MySQL**

Mas para começar, JSON é suficiente!

---

## 🚀 Performance

### P: O site está lento, o que fazer?

**R**: 
1. **Imagens**: Use WebP e comprima (TinyPNG, Squoosh)
2. **Backend**: Upgrade do plano no Railway/Render
3. **Frontend**: Já está otimizado pelo Vercel

---

### P: Posso usar CDN para imagens?

**R**: Sim! Recomendado:
- **Cloudinary** (grátis até 25GB)
- **ImgIX**
- **AWS S3 + CloudFront**

---

## 📱 Mobile

### P: O site funciona em celular?

**R**: Sim! O design é responsivo e mobile-first. Testado em:
- iPhone (Safari)
- Android (Chrome)
- Tablets

---

## 🔧 Desenvolvimento

### P: Como rodar localmente?

**R**:
```bash
# Instalar dependências
npm install

# Criar .env com configurações
cp .env.example .env

# Rodar tudo junto
npm run dev

# Ou separado:
npm start        # Frontend (porta 3000)
npm run server   # Backend (porta 4000)
```

---

### P: Posso usar yarn em vez de npm?

**R**: Sim!
```bash
yarn install
yarn dev
yarn start
yarn server
```

---

### P: Como contribuir?

**R**: 
1. Faça fork do repositório
2. Crie branch: `git checkout -b feature/nova-funcionalidade`
3. Commit: `git commit -m 'Adiciona nova funcionalidade'`
4. Push: `git push origin feature/nova-funcionalidade`
5. Abra Pull Request

---

## 📚 Recursos Úteis

- [Documentação React](https://react.dev)
- [Documentação Express](https://expressjs.com)
- [Vercel Docs](https://vercel.com/docs)
- [Railway Docs](https://docs.railway.app)
- [Mercado Pago API](https://www.mercadopago.com.br/developers)

---

## ❓ Não encontrou resposta?

1. Verifique `CORRECAO_RAPIDA.md`
2. Leia `DEPLOY.md`
3. Veja `CONFIGURACAO_VERCEL.md`
4. Abra uma issue no GitHub
5. Entre em contato pelo email de suporte

---

**Última atualização**: Janeiro 2025
