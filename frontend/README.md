# 🃏 Noble Deck — Frontend

![React](https://img.shields.io/badge/React-19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-8C56D4?style=for-the-badge)

Interface web moderna, dinâmica e responsiva desenvolvida para a **Noble Deck**, até o momento é estatica e em desenvolvimento, o backend ainda não foi integrado.

---

## 🛠️ Tecnologias Utilizadas

- **Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Ícones**: [Lucide React](https://lucide.dev/)
- **Estilização**: Vanilla CSS com Design Tokens
- **Gerenciamento de Estado**: React Context API

---

## 📁 Estrutura de Pastas

```text
frontend/
├── public/               # Favicon e ícones estáticos
├── src/
│   ├── assets/           # Imagens, cartas e logos
│   │   ├── cards/        # Cartas avulsas em alta resolução
│   │   ├── games/        # Logos oficiais dos card games
│   │   └── products/     # Produtos
│   ├── components/       # Componentes reutilizáveis
│   ├── context/          # Provedores de contexto
│   ├── data/             # Dados mockados iniciais
│   ├── pages/            # Páginas da aplicação
│   ├── types/            # Definições de tipos
│   ├── App.tsx           # Componente raiz e controle de rotas/tabs
│   ├── index.css         # Design System global, variáveis e animações
│   └── main.tsx          # Ponto de entrada da aplicação
├── index.html            # Estrutura HTML base
├── package.json          # Dependências e scripts
├── tsconfig.json         # Configurações do TypeScript
└── vite.config.ts        # Configuração do Vite
```

---

## 🚀 Como Executar o Projeto Localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- `npm` (gerenciador de pacotes)

### Passo a passo

1. **Acesse o diretório do frontend:**
   ```bash
   cd frontend
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

4. **Abra a aplicação no navegador:**
   - Acesse `http://localhost:5173`

---

## 📦 Scripts Disponíveis

- `npm run dev`: Inicia o servidor local com Hot Module Replacement (HMR).
- `npm run build`: Valida tipagem com TypeScript (`tsc -b`) e compila o bundle de produção otimizado no diretório `dist/`.
- `npm run preview`: Executa localmente o bundle gerado pelo build para validação final.
