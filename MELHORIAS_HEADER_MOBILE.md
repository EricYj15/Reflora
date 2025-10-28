# 📱 Melhorias no Header Mobile

## ✅ Mudanças Implementadas

### 1. **Logo da Flor no Mobile**

- ✅ **Desktop (> 768px):** Mostra o texto "Reflora"
- ✅ **Mobile (< 768px):** Mostra a logo da flor (`ornament.png`)
- ✅ Logo centralizada no header mobile
- ✅ Tamanho otimizado: 36x36px

### 2. **Menu Hambúrguer na Esquerda**

- ✅ Botão hambúrguer posicionado à esquerda do header
- ✅ Ícone hambúrguer se transforma em X quando aberto
- ✅ Animação suave de abertura/fechamento

### 3. **Menu Lateral Esquerdo**

- ✅ Menu desliza da **esquerda** (não da direita)
- ✅ Largura: 280px
- ✅ Menu fecha automaticamente ao clicar em qualquer link
- ✅ Overlay com backdrop blur

---

## 🎨 Como Funciona

### **Desktop (768px+)**
- Header normal com texto "Reflora"
- Todos os links visíveis
- Sem menu hambúrguer

### **Mobile (< 768px)**
```
┌─────────────────────┐
│ ☰   🌸      🛒     │  ← Header
└─────────────────────┘
┌────────┐
│ Peças  │
│ Manif. │  ← Menu lateral
│ Garant.│     (da esquerda)
│ Contat.│
└────────┘
```

---

## 📐 Layout Mobile

```
Header:
[☰ Hambúrguer]  [🌸 Logo Flor]  [👤 User] [🛒 Cart]
    (esquerda)      (centro)         (direita)
```

```
Menu Lateral (esquerda):
┌───────────────────┐
│                   │
│  Peças            │
│  Manifesto        │
│  Garantia         │
│  Contato          │
│  Painel (admin)   │
│  ─────────────    │
│  👤 Olá, Nome     │
│     Sair          │
│                   │
└───────────────────┘
```

---

## 🎯 Características

### **Logo da Flor:**
- Arquivo: `src/assets/ornament.png`
- Tamanho: 36x36px
- Centralizada no header mobile
- Substitui o texto "Reflora" automaticamente

### **Menu Hambúrguer:**
- Posição: Esquerda do header
- Cor: `var(--wine)` (vinho)
- Animação: Transform para X quando aberto
- 3 linhas → X (rotação 45deg)

### **Menu Lateral:**
- Abre da esquerda para a direita
- Sombra: `4px 0 24px` (para a direita)
- Transform: `translateX(-100%)` → `translateX(0)`
- Background: Branco com blur
- Scroll automático se muitos itens

---

## 🔧 Customização

### **Mudar tamanho da logo:**
No `Header.module.css`:
```css
.brandLogo {
  width: 36px;  /* ← Mude aqui */
  height: 36px; /* ← Mude aqui */
}
```

### **Mudar largura do menu:**
```css
.nav {
  width: 280px; /* ← Mude aqui */
}
```

### **Mudar velocidade da animação:**
```css
.nav {
  transition: transform 0.3s ease; /* ← Mude 0.3s */
}
```

### **Usar outra logo:**
No `Header.js`:
```javascript
import ornamentLogo from '../../assets/SUA_LOGO.png'; // ← Mude aqui
```

---

## 🚀 Para Testar

### **Localmente:**
```bash
npm start
```
Depois pressione **F12** → Modo responsivo → Reduza para < 768px

### **Em Produção:**
1. Commit e push
2. Vercel faz deploy automático
3. Teste no celular real

---

## 📱 Breakpoints

- **Mobile:** 0px - 767px
  - Logo da flor
  - Menu hambúrguer à esquerda
  - Menu lateral esquerdo
  
- **Desktop:** 768px+
  - Texto "Reflora"
  - Links no header
  - Sem hambúrguer

---

## ✨ Melhorias Visuais

- ✅ Logo da flor mais profissional no mobile
- ✅ Menu à esquerda (padrão mais comum)
- ✅ Hambúrguer à esquerda (mais acessível)
- ✅ Logo centralizada (equilíbrio visual)
- ✅ Animações suaves
- ✅ Backdrop blur no menu

---

**Tudo pronto!** 🌸

Agora o header tem:
- Logo da flor no mobile
- Menu hambúrguer na esquerda
- Menu lateral que abre da esquerda
 
