# 🚨 CONFIGURAR WEBHOOK DO MERCADO PAGO - URGENTE

## ⚠️ IMPORTANTE: Este passo é OBRIGATÓRIO para o sistema de pagamentos funcionar corretamente!

Sem o webhook configurado, o status dos pedidos **NÃO será atualizado automaticamente** após o pagamento.

---

## 📋 Checklist Rápido

- [ ] Fazer redeploy do backend no Railway/Render
- [ ] Aguardar deploy completar (2-3 minutos)
- [ ] Acessar painel do Mercado Pago
- [ ] Configurar webhook com a URL do backend
- [ ] Testar com um pedido real

---

## 🔧 Passo a Passo Detalhado

### 1️⃣ **Fazer Redeploy do Backend**

Antes de configurar o webhook, você precisa fazer redeploy do backend para que o endpoint `/api/webhooks/mercadopago` esteja disponível.

**Railway:**
1. Acesse: https://railway.app/
2. Entre no seu projeto Reflora
3. Clique em "Deploy" ou force um redeploy
4. Aguarde completar (verifique os logs)

**Render:**
1. Acesse: https://dashboard.render.com/
2. Entre no seu serviço backend
3. Clique em "Manual Deploy" → "Deploy latest commit"
4. Aguarde completar

---

### 2️⃣ **Acessar Painel do Mercado Pago**

1. **Acesse:** https://www.mercadopago.com.br/developers/panel/app
2. **Faça login** com sua conta do Mercado Pago
3. **Selecione sua aplicação** (a que você criou para a Reflora)

---

### 3️⃣ **Configurar o Webhook**

#### **Passo 1: Encontrar a seção de Webhooks**
- No menu lateral, procure por **"Webhooks"** ou **"Notificações"**
- Clique para abrir a página de configuração

#### **Passo 2: Adicionar novo webhook**
- Clique em **"Adicionar webhook"** ou **"Create webhook"**
- Preencha os campos:

**URL do Webhook:**
```
https://SEU-BACKEND.railway.app/api/webhooks/mercadopago
```
ou
```
https://SEU-BACKEND.onrender.com/api/webhooks/mercadopago
```

⚠️ **IMPORTANTE:** Substitua `SEU-BACKEND` pela URL real do seu backend!

**Exemplo:**
- Railway: `https://reflora-production.up.railway.app/api/webhooks/mercadopago`
- Render: `https://reflora-backend.onrender.com/api/webhooks/mercadopago`

#### **Passo 3: Selecionar eventos**
Marque apenas:
- ✅ **Payments** (Pagamentos)
- ✅ **payment.created** (opcional)
- ✅ **payment.updated** (recomendado)

❌ NÃO precisa marcar:
- Merchant orders
- Chargebacks
- Plan subscriptions

#### **Passo 4: Salvar**
- Clique em **"Salvar"** ou **"Create"**
- O Mercado Pago fará um teste enviando uma notificação
- Se aparecer ✅ verde = funcionou!
- Se aparecer ❌ vermelho = verifique a URL

---

### 4️⃣ **Verificar se Está Funcionando**

#### **Testar Logs do Backend:**
1. Acesse os logs do Railway/Render
2. Procure por: `📩 Webhook do Mercado Pago recebido`
3. Se aparecer, o webhook está funcionando!

#### **Testar com Pedido Real:**
1. Faça um pedido de teste
2. Pague com PIX ou cartão de teste
3. Aguarde 30-60 segundos
4. Recarregue a página "Meus Pedidos"
5. Status deve mudar de "Aguardando Pagamento" → "Pagamento Confirmado"

---

## 🎯 Como Saber se Está Funcionando?

### ✅ **Funcionando Corretamente:**
- Logs do backend mostram: `✅ Pagamento aprovado para pedido XXX`
- Status do pedido muda automaticamente de `pending_payment` → `paid`
- Cliente vê "Pagamento Confirmado" em "Meus Pedidos"

### ❌ **NÃO Funcionando:**
- Logs não mostram notificações do MP
- Status do pedido fica travado em "Aguardando Pagamento"
- Cliente precisa atualizar manualmente

---

## 🔍 Troubleshooting (Resolução de Problemas)

### Problema 1: "URL inválida" no Mercado Pago
**Solução:**
- Verifique se a URL está correta (sem espaços)
- Certifique-se que o backend está no ar (acesse a URL no navegador)
- Teste a URL: `https://SEU-BACKEND/api/webhooks/mercadopago` deve retornar 200

### Problema 2: Webhook não recebe notificações
**Solução:**
- Verifique os logs do backend
- Certifique-se que `MP_ACCESS_TOKEN` está configurado nas variáveis de ambiente
- Teste manualmente enviando um POST para o endpoint

### Problema 3: Status não atualiza
**Solução:**
- Verifique se o `external_reference` no Mercado Pago é o ID do pedido
- Confira os logs: `🔍 Consultando pagamento XXX no Mercado Pago...`
- Verifique se o pedido existe no banco de dados

---

## 🌐 URLs Úteis

- **Painel do Mercado Pago:** https://www.mercadopago.com.br/developers/panel/app
- **Documentação Webhooks:** https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
- **Railway Dashboard:** https://railway.app/
- **Render Dashboard:** https://dashboard.render.com/

---

## 📞 Ajuda Adicional

Se tiver problemas:
1. Verifique os logs do backend em tempo real
2. Teste com cartão de crédito de teste do Mercado Pago
3. Use o ambiente Sandbox primeiro para testar

**Cartões de Teste MP:**
- **Aprovado:** `5031 4332 1540 6351` (VISA)
- **CVV:** `123`
- **Validade:** Qualquer data futura
- **Nome:** Qualquer nome

---

## ✅ Quando Completar

Após configurar com sucesso:
- [ ] Marque este item como concluído
- [ ] Faça um pedido de teste
- [ ] Confirme que o status atualiza automaticamente
- [ ] Documente a URL do webhook em um lugar seguro

---

## 🎉 Pronto!

Depois de configurar o webhook, seu sistema de pagamentos estará 100% automatizado! 🚀

**Data de criação deste guia:** 29/10/2025
**Última atualização:** 29/10/2025
