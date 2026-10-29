import React, { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, Plus, TrendingUp, Wallet, X } from "lucide-react";
import { brl, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../finance";
import "./ReferenceDashboard.css";

const total = rows => rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
const monthLabel = key => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("pt-BR", { month:"short" }).replace(".","");
};
const changeMonth = (key, offset) => {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(year, month - 1 + offset, 1);
  return d.getFullYear() + "-" + String(d.getMonth()+1).padStart(2,"0");
};
const getDate = row => row.data || row.vencimento || "";
const palette = ["#10b981","#6366f1","#f59e0b","#0ea5e9","#ec4899","#f97316","#94a3b8"];

// Dashboard da referência: recebe os registros reais; não escreve dados no Firebase.
export default function ReferenceDashboard({ month, expenses, incomes, pending, overdue, paid, onAddExpense, onAddIncome }) {
  const [showAlerts, setShowAlerts] = useState(false);
  const [chartKind, setChartKind] = useState("despesas");
  const currentExpenses = useMemo(() => expenses.filter(r => !r.excluido && r.vencimento?.slice(0,7) === month), [expenses, month]);
  const currentIncomes = useMemo(() => incomes.filter(r => !r.excluido && getDate(r).slice(0,7) === month), [incomes, month]);
  const expenseTotal = total(currentExpenses), incomeTotal = total(currentIncomes), balance = incomeTotal - expenseTotal;
  const alerts = [...overdue, ...pending].sort((a,b) => (a.vencimento||"").localeCompare(b.vencimento||""));
  const categories = (chartKind === "despesas" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES);
  const items = chartKind === "despesas" ? currentExpenses : currentIncomes;
  const chartData = categories.map((c,i) => ({ id:c.id, name:c.label, color:c.color || palette[i%palette.length], value:total(items.filter(r => r.categoriaId === c.id)) })).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
  const chartMax = Math.max(1, ...chartData.map(d => d.value));
  const currentYear = new Date().getFullYear();
  const months = useMemo(() => Array.from({length:12},(_,i) => `${currentYear}-${String(i+1).padStart(2,"0")}`),[currentYear]);
  const trend = months.map(key => ({
    key, label:monthLabel(key),
    expenses:total(expenses.filter(r=>!r.excluido && r.vencimento?.slice(0,7)===key)),
    incomes:total(incomes.filter(r=>!r.excluido && getDate(r).slice(0,7)===key))
  }));
  const maxTrend = Math.max(1,...trend.flatMap(r=>[r.expenses,r.incomes]));
  return <div className="ref-dashboard">
    <section className="ref-welcome">
      <div><span className="ref-eyebrow">PAINEL FINANCEIRO</span><h1>Visão geral <span>das suas finanças</span></h1><p>Controle receitas, despesas e vencimentos em um só lugar.</p></div>
      <div className="ref-welcome-actions"><button className="ref-add-secondary" onClick={onAddIncome}><ArrowUpRight size={17}/> Nova receita</button><button className="ref-add-primary" onClick={onAddExpense}><Plus size={17}/> Nova despesa</button></div>
    </section>
    <div className="ref-kpi-grid">
      <div className="ref-kpi"><div className="ref-kpi-caption"><span>Receitas do mês</span><span className="ref-kpi-icon green"><ArrowUpRight size={19}/></span></div><strong>{brl(incomeTotal)}</strong><small>{currentIncomes.length} lançamentos de receita</small></div>
      <div className="ref-kpi"><div className="ref-kpi-caption"><span>Despesas do mês</span><span className="ref-kpi-icon red"><ArrowDownRight size={19}/></span></div><strong>{brl(expenseTotal)}</strong><small>{currentExpenses.length} lançamentos de despesa</small></div>
      <div className="ref-kpi"><div className="ref-kpi-caption"><span>Saldo do mês</span><span className={"ref-kpi-icon "+(balance>=0?"green":"red")}><Wallet size={19}/></span></div><strong className={balance<0?"ref-negative":"ref-positive"}>{brl(balance)}</strong><small>Receitas menos despesas</small></div>
      <div className="ref-kpi"><div className="ref-kpi-caption"><span>Contas pendentes</span><span className="ref-kpi-icon amber"><CalendarClock size={19}/></span></div><strong>{brl(total([...pending,...overdue]))}</strong><small>{pending.length+overdue.length} contas aguardando pagamento</small></div>
    </div>
    <div className="ref-visual-grid">
      <section className="ref-visual-card"><header className="ref-card-header"><div><h2><TrendingUp size={18}/> Evolução financeira</h2><p>Receitas e despesas de janeiro a dezembro de {currentYear}</p></div></header>
        <div className="ref-chart-legend"><span><i className="ref-green"/>Receitas</span><span><i className="ref-red"/>Despesas</span></div>
        <div className="ref-trend-chart" role="img" aria-label={`Gráfico de receitas e despesas de janeiro a dezembro de ${currentYear}`}>
          {trend.map(row => <div className="ref-trend-column" key={row.key} title={row.key+" | Receitas: "+brl(row.incomes)+" | Despesas: "+brl(row.expenses)}><div className="ref-trend-bars"><span className="ref-trend-bar ref-trend-income" style={{height:(row.incomes/maxTrend*100)+"%"}}/><span className="ref-trend-bar ref-trend-expense" style={{height:(row.expenses/maxTrend*100)+"%"}}/></div><span className="ref-trend-label">{row.label}</span></div>)}
        </div>
      </section>
      <section className="ref-visual-card"><header className="ref-card-header"><div><h2>Valores por categoria</h2><p>Distribuição dos lançamentos do mês</p></div><div className="ref-select-wrap"><select aria-label="Tipo de categoria" value={chartKind} onChange={e=>setChartKind(e.target.value)}><option value="despesas">Despesas</option><option value="receitas">Receitas</option></select><ChevronDown size={14}/></div></header>
        {chartData.length ? <div className="ref-category-chart">{chartData.slice(0,7).map(c=><div className="ref-category-item" key={c.id}><div><span>{c.name}</span><strong>{brl(c.value)}</strong></div><div className="ref-category-track"><i style={{width:(c.value/chartMax*100)+"%",background:c.color}}/></div></div>)}</div> : <p className="ref-empty">Nenhum lançamento nesta categoria durante o mês.</p>}
      </section>
    </div>
    <div className="ref-alert-strip"><div className="ref-alert-info"><span className={"ref-kpi-icon "+(overdue.length?"red":"green")}>{overdue.length?<CircleAlert size={18}/>:<CheckCircle2 size={18}/>}</span><div><strong>{overdue.length ? overdue.length+" conta(s) atrasada(s)" : "Vencimentos sob controle"}</strong><p>{overdue.length ? "Confira os pagamentos pendentes deste mês." : pending.length ? pending.length+" conta(s) aguardando pagamento." : "Nenhuma conta pendente neste mês."}</p></div></div><button type="button" onClick={()=>setShowAlerts(v=>!v)}>{showAlerts?"Ocultar":"Ver alertas"} {showAlerts?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button></div>
    {showAlerts && <div className="ref-alert-list">{alerts.length?alerts.map(r=><div className="ref-alert-item" key={r.id}><div><b>{r.nome}</b><small>Vencimento: {r.vencimento}</small></div><strong>{brl(r.valor)}</strong></div>):<p className="ref-empty">Nenhum alerta para este mês.</p>}</div>}
  </div>;
}
