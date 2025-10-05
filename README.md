# 🌸 Reflora - Moda que Floresce de Novo

Website oficial da **Reflora**, uma marca brasileira de moda upcycling que transforma peças esquecidas em obras de arte únicas.

## ✨ Sobre o Projeto

Este é um site de lançamento desenvolvido com React.js que incorpora o conceito poético de "Flores Noturnas" - uma experiência imersiva que convida os visitantes a explorarem um jardim secreto digital à meia-noite, onde cada peça de roupa única desabrocha sob a luz das estrelas.

### 🎨 Características Principais

- **Fundo Estrelado Animado**: Canvas com partículas e efeito parallax
- **Hero Section**: Logo com animação de pulso orgânico e scroll suave
- **Grid de Produtos Assimétrico**: Layout masonry com animações de entrada
- **Modal de Produto Acessível**: Galeria de imagens com navegação por teclado
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
src/
├── components/
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

2. Instale as dependências:
```bash
npm install
```

### Executando Localmente

Para iniciar o servidor de desenvolvimento:

```bash
npm start
```

O site será aberto automaticamente em [http://localhost:3000](http://localhost:3000).

A página recarrega automaticamente quando você faz alterações no código.

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

### Links de Compra dos Produtos

Edite o arquivo `src/data/products.js` e atualize o campo `purchaseLink` de cada produto com seus links reais de pagamento.

## 🎯 Funcionalidades Técnicas

- **React Hooks**: useState, useEffect, useRef para gerenciamento de estado
- **CSS Modules**: Estilos encapsulados por componente
- **Intersection Observer**: Animações de scroll detectadas automaticamente
- **Canvas API**: Animação de partículas do fundo estrelado
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
