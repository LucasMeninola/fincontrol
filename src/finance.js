export const EXPENSE_CATEGORIES = [
  {id:'moradia',label:'Moradia',color:'#b45309',bg:'#ffedd5',icon:'House'},
  {id:'transporte',label:'Transporte',color:'#0891b2',bg:'#cffafe',icon:'Car'},
  {id:'alimentacao',label:'Alimentação',color:'#15803d',bg:'#dcfce7',icon:'Utensils'},
  {id:'saude',label:'Saúde',color:'#e11d48',bg:'#ffe4e6',icon:'Heart'},
  {id:'lazer',label:'Lazer',color:'#7c3aed',bg:'#ede9fe',icon:'Clapperboard'},
  {id:'assinaturas',label:'Assinaturas',color:'#2563eb',bg:'#dbeafe',icon:'Repeat2'},
  {id:'trabalho',label:'Trabalho',color:'#0f766e',bg:'#ccfbf1',icon:'Briefcase'},
  {
  id: "cartao",
  label: "Cartão",
  color: "#6366f1",
  bg: "#e0e7ff",
  icon: "CreditCard",
  },
  {id:'outros',label:'Outros',color:'#64748b',bg:'#f1f5f9',icon:'CircleEllipsis'}
];
export const INCOME_CATEGORIES = [
  {id:'salario',label:'Salário',color:'#16a34a',bg:'#dcfce7',icon:'Wallet'},
  {id:'freela',label:'Freela',color:'#0ea5e9',bg:'#e0f2fe',icon:'Briefcase'},
  {id:'invest',label:'Investimentos',color:'#8b5cf6',bg:'#ede9fe',icon:'PiggyBank'},
  {id:'venda',label:'Vendas',color:'#f59e0b',bg:'#fef3c7',icon:'BadgeDollarSign'},
  {id:'outros',label:'Outra Renda',color:'#78716c',bg:'#f5f5f4',icon:'Banknote'}
];
export const PAYMENT_METHODS = ['Pix','Boleto','Cartão','Dinheiro'];
export const brl = n => Number(n || 0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
export const todayISO = () => {const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const currentMonth=()=>todayISO().slice(0,7);
export const monthFromISO = date => String(date||'').slice(0,7);
export const formatDate = date => date && /^\d{4}-\d\d-\d\d$/.test(date) ? `${date.slice(8,10)}/${date.slice(5,7)}/${date.slice(0,4)}` : '—';
export const monthTitle = m => new Date(`${m}-15T12:00:00`).toLocaleString('pt-BR',{month:'long',year:'numeric'}).replace(/^./,v=>v.toUpperCase());
export const changeMonth = (m, shift) => {const [y,mm]=m.split('-').map(Number);const date=new Date(y,mm-1+shift,1);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;};
export const addMonths = (iso,shift) => {const [y,m,d]=iso.split('-').map(Number);const base=new Date(y,m-1+shift,1);const max=new Date(base.getFullYear(),base.getMonth()+1,0).getDate();return `${base.getFullYear()}-${String(base.getMonth()+1).padStart(2,'0')}-${String(Math.min(d,max)).padStart(2,'0')}`;};
export const categoryOf=(kind,id)=> (kind==='receitas'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).find(c=>c.id===id) || (kind==='receitas'?INCOME_CATEGORIES:EXPENSE_CATEGORIES).at(-1);
export const statusOf=(row,today=todayISO())=>row.status==='pago'?'pago':row.vencimento<today?'atrasado':'pendente';
export const sum=rows=>rows.reduce((total,item)=>total+Number(item.valor||0),0);
export const defaultItem=(kind,month)=>({nome:'',valor:'',data:`${month}-01`,vencimento:`${month}-01`,categoriaId:kind==='receitas'?'salario':'moradia',forma:'Pix',tipo:'unico',recorrente:false,parcelasTotal:2,notas:'',comprovanteBase64:''});
export const currencyInput = raw => {let str=String(raw).trim().replace(/[^\d,.-]/g,'');if(str.includes(',')&&str.includes('.'))str=str.replaceAll('.','').replace(',','.');else str=str.replace(',','.');return Number(str);};
export const csvCell=s=>'"'+String(s??'').replaceAll('"','""')+'"';
export function downloadFile(filename,data,type='application/json;charset=utf-8') {const blob=new Blob([data],{type});const a=document.createElement('a');const url=URL.createObjectURL(blob);a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export async function fileToSmallJPEG(file) {
  if (!file.type.startsWith('image/')) throw Error('Selecione uma imagem.');
  if (file.size>12*1024*1024) throw Error('Imagem acima do limite de 12 MB.');
  const img=await createImageBitmap(file);
  const factor=Math.min(1,1200/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*factor);canvas.height=Math.round(img.height*factor);
  const context=canvas.getContext('2d');context.drawImage(img,0,0,canvas.width,canvas.height);img.close?.();
  let url=canvas.toDataURL('image/jpeg',.65);
  if(url.length>350000){canvas.width=Math.round(canvas.width*.7);canvas.height=Math.round(canvas.height*.7);context.drawImage(await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=url;}),0,0,canvas.width,canvas.height);url=canvas.toDataURL('image/jpeg',.5);}
  if(url.length>450000)throw Error('Imagem muito grande para o documento Firestore; use uma foto menor.');
  return url;
}
