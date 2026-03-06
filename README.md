# Dashboard de Indicadores - Pesquisa de Clima

Este projeto é um dashboard moderno desenvolvido em HTML, CSS e JavaScript para visualizar indicadores de clima organizacional (LG vs GPTW) a partir de um arquivo CSV.

## 🚀 Como Executar Localmente

1.  Mantenha o arquivo `FEEDBACK - PESQUISA DE CLIMA (1).CSV` na mesma pasta que o `index.html`.
2.  Abra o `index.html` em seu navegador.
    *   *Nota*: Devido a restrições de segurança do navegador (CORS), ao abrir o arquivo diretamente do disco (`file://`), o carregamento do CSV pode falhar. É recomendado usar uma extensão de "Live Server" no VS Code ou subir para o Vercel/GitHub Pages.

## 📊 Indicadores Principais

-   **LG**: Resultado do sistema interno de feedbacks.
-   **GPTW**: Quantidade de pessoas que responderam sobre o recebimento de feedbacks.
-   **GAP (%)**: Divergência percentual entre o LG (Sistêmico) e o GPTW (Percebido).

## ☁️ Como Subir no Vercel / GitHub

### 1. Preparar o Repositório no GitHub
1.  Crie um novo repositório no [GitHub](https://github.com/new).
2.  Suba os seguintes arquivos:
    -   `index.html`
    -   `style.css`
    -   `app.js`
    -   `FEEDBACK - PESQUISA DE CLIMA (1).CSV`

### 2. Conectar ao Vercel
1.  Acesse o [Vercel](https://vercel.com/dashboard).
2.  Clique em **"Add New"** > **"Project"**.
3.  Importe o repositório do GitHub que você acabou de criar.
4.  Clique em **"Deploy"**.
5.  O Vercel fornecerá um link público (ex: `meu-dashboard.vercel.app`) para acessar seu projeto de qualquer lugar.

## 🛠️ Tecnologias Utilizadas
-   **Vanilla JS**: Lógica central e processamento de dados.
-   **PapaParse**: Parsing robusto de arquivos CSV.
-   **Chart.js**: Visualizações gráficas interativas.
-   **Lucide Icons**: Ícones modernos e premium.
-   **Inter Font**: Tipografia limpa e profissional.

---
Desenvolvido com foco em estética premium e facilidade de análise.
