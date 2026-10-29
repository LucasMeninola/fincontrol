import {existsSync} from 'node:fs';
for(const f of ['src/App.jsx','src/style.css','src/firebase.js','firestore.rules','.github/workflows/deploy.yml']){if(!existsSync(f))throw Error(`Arquivo ausente: ${f}`)}
console.log('Estrutura do projeto OK');
