import React, { useMemo, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronUp, CircleAlert, CreditCard, Percent, TrendingUp } from "lucide-react";
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
  const paidValue = total(paid);
  const outstanding = [...pending, ...overdue];
  const outstandingValue = total(outstanding);
  const totalMonth = paidValue + outstandingValue;
  const progress = totalMonth ? Math.min(100,Math.round(paidValue/totalMonth*100)) : 0;
  const today = new Date();
  const todayKey = [today.getFullYear(),String(today.getMonth()+1).padStart(2,"0"),String(today.getDate()).padStart(2,"0")].join("-");
  const dueToday = outstanding.filter(r=>r.vencimento===todayKey);
  const yearOfMonth = Number(month.slice(0,4));
  const indexOfMonth = Number(month.slice(5,7))-1;
  const firstWeekday = new Date(yearOfMonth,indexOfMonth,1).getDay();
  const days = new Date(yearOfMonth,indexOfMonth+1,0).getDate();
  const monthName = new Date(yearOfMonth,indexOfMonth,1).toLocaleDateString("pt-BR",{month:"long"});
  const categoryExpenses = EXPENSE_CATEGORIES.map(c=>({...c,value:total(currentExpenses.filter(r=>r.categoriaId===c.id))})).filter(c=>c.value>0).sort((a,b)=>b.value-a.value);
  const dayStatus = date => {
    const records = currentExpenses.filter(r=>r.vencimento===date);
    if(records.some(r=>r.status!=="pago" && date<todayKey)) return "late";
    if(records.some(r=>r.status!=="pago"))return "pending";
    if(records.length)return "paid";
    return "";
  };

  return <div className="ref-dashboard">
    <div className="ref-home-layout">
      <div className="ref-home-main">
        <div className="ref-home-kpis">
          <article className="ref-home-kpi"><div className="ref-home-kpi-head"><span className="ref-home-kpi-icon navy"><CreditCard size={16}/></span><span className="ref-home-tag">ESTE MÊS</span></div><p>TOTAL A PAGAR</p><strong>{brl(outstandingValue)}</strong><small>{outstanding.length} contas pendentes</small></article>
          <article className="ref-home-kpi"><div className="ref-home-kpi-head"><span className="ref-home-kpi-icon mint"><TrendingUp size={16}/></span><span className="ref-home-tag green">PAGO</span></div><p>TOTAL PAGO</p><strong>{brl(paidValue)}</strong><small>{paid.length} quitadas</small></article>
          <article className="ref-home-kpi warning"><div className="ref-home-kpi-head"><span className="ref-home-kpi-icon coral"><CircleAlert size={16}/></span><span className="ref-home-tag red">ATENÇÃO</span></div><p>ATRASADAS</p><strong>{overdue.length}</strong><small>{overdue.length ? "Ação necessária" : "Nenhuma atrasada"}</small></article>
          <article className="ref-home-kpi"><div className="ref-home-kpi-head"><span className="ref-home-kpi-icon pale"><CalendarDays size={16}/></span><span className="ref-home-tag">HOJE</span></div><p>VENCE HOJE</p><strong>{dueToday.length}</strong><small>{dueToday.length ? brl(total(dueToday))+" a vencer" : "Nenhuma hoje"}</small></article>
        </div>
        <div className="ref-home-lower">
          <section className="ref-home-progress">
            <div className="ref-home-section-head"><h2><span className="ref-home-round-icon"><Percent size={16}/></span>Progresso do mês</h2><span>{progress}% pago</span></div>
            <div className="ref-home-progress-track"><i style={{width:progress+"%"}} /></div>
            <div className="ref-home-progress-details"><span>Pago {brl(paidValue)}</span><span>Falta {brl(outstandingValue)}</span></div>
          </section>
          <section className="ref-home-calendar">
            <div className="ref-home-section-head"><h2><CalendarDays size={16}/> Calendário {monthName}</h2><small>{yearOfMonth}</small></div>
            <div className="ref-home-calendar-grid">
              {["D","S","T","Q","Q","S","S"].map((day,i)=><span className="ref-home-weekday" key={"wd"+i}>{day}</span>)}
              {Array.from({length:firstWeekday},(_,i)=><span key={"blank"+i}/>)}
              {Array.from({length:days},(_,i)=>{
                const day=i+1,date=month+"-"+String(day).padStart(2,"0");
                const status=dayStatus(date);
                return <span key={date} title={date} className={["ref-home-day",status,date===todayKey?"is-today":""].join(" ")}>{day}</span>;
              })}
            </div>
          </section>
        </div>
      </div>
      <aside className="ref-home-side">
        <section className="ref-home-summary">
          <h2>Resumo • {monthName} de {yearOfMonth}<span><TrendingUp size={16}/></span></h2>
          <div className="ref-home-summary-line"><div><span>PAGO</span><strong>{brl(paidValue)}</strong></div><div className="ref-home-dark-track"><i style={{width:progress+"%"}}/></div></div>
          <div className="ref-home-summary-line"><div><span>PENDENTE</span><strong>{brl(outstandingValue)}</strong></div><div className="ref-home-dark-track"><i className="pending" style={{width:(100-progress)+"%"}}/></div></div>
          <div className="ref-home-summary-total"><span>Total do mês</span><strong>{brl(totalMonth)}</strong></div>
        </section>
        <section className="ref-home-category">
          <h2><span className="ref-home-round-icon"><Percent size={15}/></span>Por categoria</h2>
          {categoryExpenses.length ? categoryExpenses.slice(0,5).map((c,i)=>{
            const pct=expenseTotal ? Math.round(c.value/expenseTotal*100) : 0;
            return <div className="ref-home-category-row" key={c.id}>
              <div className="ref-home-category-meta"><span className="ref-home-category-symbol" style={{background:c.bg||"#e2e8f0",color:c.color||"#334155"}}>{(c.label||"C").slice(0,1)}</span><strong>{c.label}</strong><small>{pct}% • {brl(c.value)}</small></div>
              <div className="ref-home-category-track"><i style={{width:pct+"%",background:c.color||"#0f172a"}}/></div>
            </div>;
          }) : <p className="ref-empty">Nenhuma despesa neste mês.</p>}
        </section>
      </aside>
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
