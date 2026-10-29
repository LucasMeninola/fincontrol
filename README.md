# FinAlert — versão React + Firebase baseada na interface HTML original

Recriação da interface do arquivo `index(1).html` fornecido: topo, cartões, três colunas, calendário, filtros, listas, modais, alertas, lixeira, exportação, importação, temas e botões flutuantes. O HTML original compilado também está em `referencia/` para comparação visual. Não são usados dados fictícios: a lista começa vazia e lê/escreve no Firestore autenticado.

## Rodar no Windows

```cmd
cd C:\Projetos\fincontrol-identico-react
copy .env.example .env
notepad .env
npm install
npm run dev
```

No Firebase Console, crie um projeto e um aplicativo Web, copie as configurações para `.env` (campos `VITE_FIREBASE_*`), ative **Authentication > Sign-in method > Email/Password**, crie o banco **Firestore Database** e publique as regras contidas em `firestore.rules` em **Firestore Database > Rules**. Não use `allow read, write: if true`.

Cada usuário usa as coleções `users/{uid}/despesas` e `users/{uid}/receitas`. É necessário estar logado para acessar os lançamentos. Se receber `Missing or insufficient permissions`, confirme que as regras foram publicadas no projeto indicado por `VITE_FIREBASE_PROJECT_ID`, e que o usuário fez login. As regras devem permitir acesso somente ao próprio UID.

## Publicar no GitHub Pages

1. Crie um repositório, envie os arquivos deste diretório para a branch `main`.
2. Em **Settings > Pages**, selecione **GitHub Actions** como fonte.
3. Em **Settings > Secrets and variables > Actions > Variables**, crie as seis variáveis `VITE_FIREBASE_*` com os mesmos valores do `.env`.
4. Em **Firebase Authentication > Settings > Authorized domains**, adicione o domínio `<usuario>.github.io`.
5. O workflow `.github/workflows/deploy.yml` executa `npm install`, `npm run build` e publica `dist`.

O Firebase Web API key é uma configuração pública de cliente, não uma senha; a segurança depende das regras do Firestore e do Authentication. Nunca inclua credenciais de Admin SDK ou service accounts no repositório.

## Funcionalidades

- Login, cadastro, recuperação de senha e logout com Firebase Auth.
- Sincronização Firestore em tempo real (`onSnapshot`) e dados por usuário.
- Receitas/despesas com categorias, pagamento, data, notas, forma e comprovante compactado em base64.
- Pagamento/desfazer, edição, lixeira/restauração/exclusão definitiva.
- Parcelamento em 2–360 registros, cada parcela com vencimento mensal; o valor digitado é tratado como **total do parcelamento**.
- Tipo recorrente: identifica o lançamento como recorrente; **não gera automaticamente meses futuros** (para evitar cobranças automáticas não solicitadas).
- Indicadores, filtros, pesquisa, calendário, próximos vencimentos, gráficos de barras, tema, CSV e backup/importação JSON.

**Limitações:** uma recriação de fonte editável não equivale ao código-fonte original minificado; diferenças pontuais de pixels e comportamento podem existir. Comprovantes são comprimidos para caber no limite de documentos Firestore; para uso intenso, migre fotos para Firebase Storage. Os totais consideram o mês selecionado e a data de vencimento das despesas. O projeto requer configuração real do Firebase. Build não pôde ser executado neste ambiente porque a instalação npm não concluiu; valide com `npm install && npm run build` localmente.
