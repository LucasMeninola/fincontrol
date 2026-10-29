import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, FileText, Settings2, Download, Bell, Volume2, X, Printer } from "lucide-react";
import { brl } from "../finance";

/** Recursos da interface de referência, conectados às despesas e receitas existentes. */
export default function ReferenceFeatures({ month, expenses, incomes, exportData }) {
  const [popup, setPopup] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [notifications, setNotifications] = useState(() => localStorage.getItem("fincontrol-notifications") === "true");
  const [sound, setSound] = useState(() => localStorage.getItem("fincontrol-sound") === "true");
  const [reportType, setReportType] = useState("ambos");

  useEffect(() => { localStorage.setItem("fincontrol-notifications", String(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem("fincontrol-sound", String(sound)); }, [sound]);

  // O Firestore já filtra as informações pelo UID no componente App.
  const rows = useMemo(() => [
    ...expenses.filter(item => !item.excluido).map(item => ({ ...item, kind: "despesas" })),
    ...incomes.filter(item => !item.excluido).map(item => ({ ...item, kind: "receitas" }))
  ].filter(item => (item.kind === "receitas" ? item.data || item.vencimento : item.vencimento)?.startsWith(month)), [expenses, incomes, month]);

  const [year, monthNumber] = month.split("-").map(Number);
  const calendarCells = useMemo(() => {
    const firstWeekday = new Date(year, monthNumber - 1, 1).getDay();
    const daysInMonth = new Date(year, monthNumber, 0).getDate();
    return [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  }, [year, monthNumber]);

  const dateOf = (row) => row.kind === "receitas" ? row.data || row.vencimento : row.vencimento;
  const dayRows = selectedDay ? rows.filter(row => dateOf(row) === month + "-" + String(selectedDay).padStart(2, "0")) : [];

  const printReport = () => {
    const filtered = rows.filter(r => reportType === "ambos" || r.kind === reportType);
    const total = kind => filtered.filter(r => r.kind === kind).reduce((acc,r) => acc + Number(r.valor || 0), 0);
    const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
    const doc = "<!doctype html><html lang='pt-BR'><head><meta charset='utf-8'><title>Relatório FinControl</title><style>body{font:14px Arial;padding:32px;color:#0f172a}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:9px;text-align:left}h1{color:#0f766e}p{margin:8px 0}</style></head><body><h1>FinControl — Relatório " + escapeHtml(month) + "</h1><p>Receitas: " + brl(total("receitas")) + " | Despesas: " + brl(total("despesas")) + " | Saldo: " + brl(total("receitas") - total("despesas")) + "</p><table><thead><tr><th>Tipo</th><th>Descrição</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead><tbody>" + filtered.map(r => "<tr><td>" + escapeHtml(r.kind) + "</td><td>" + escapeHtml(r.nome) + "</td><td>" + escapeHtml(dateOf(r)) + "</td><td>" + escapeHtml(brl(r.valor)) + "</td><td>" + escapeHtml(r.status) + "</td></tr>").join("") + "</tbody></table></body></html>";
    const file = new Blob([doc], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fincontrol-relatorio-" + month + ".html";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const enableNotifications = async () => {
    if (!("Notification" in window)) { window.alert("Notificações não são suportadas neste navegador."); return; }
    const permission = await Notification.requestPermission();
    setNotifications(permission === "granted");
  };

  return (
    <>
      <section className="panel ref-panel">
        <h3><span><CalendarDays size={17} /> Calendário financeiro</span></h3>
        <div className="ref-calendar">
          {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(day => <span key={day} className="ref-weekday">{day}</span>)}
          {calendarCells.map((day, index) => {
            const date = day ? month + "-" + String(day).padStart(2,"0") : "";
            const records = rows.filter(r => dateOf(r) === date);
            return day ? (
              <button key={date} type="button" aria-label={date} className={"ref-day " + (selectedDay === day ? "active" : "")} onClick={() => setSelectedDay(selectedDay === day ? null : day)}>
                {day}<span className="ref-dots">{records.some(r => r.kind === "despesas") && <i className="ref-dot expense"/>}{records.some(r => r.kind === "receitas") && <i className="ref-dot income"/>}</span>
              </button>
            ) : <span key={"empty"+index} />;
          })}
        </div>
        {selectedDay && <div className="ref-day-details"><strong>Lançamentos de {String(selectedDay).padStart(2,"0")}/{String(monthNumber).padStart(2,"0")}</strong>{dayRows.length ? dayRows.map(r => <div key={r.kind + r.id} className="ref-entry"><span>{r.nome}</span><b className={r.kind === "receitas" ? "ref-positive" : ""}>{r.kind === "receitas" ? "+" : "−"}{brl(r.valor)}</b></div>) : <p>Nenhum lançamento nessa data.</p>}</div>}
      </section>
      <section className="panel ref-panel">
        <h3><span><Settings2 size={17}/> Ações e ferramentas</span></h3>
        <div className="ref-actions">
          <button type="button" onClick={() => setPopup("report")}><FileText size={16}/> Relatórios</button>
          <button type="button" onClick={() => setPopup("settings")}><Settings2 size={16}/> Configurações</button>
          <button type="button" onClick={() => exportData("json")}><Download size={16}/> Backup JSON</button>
          <button type="button" onClick={() => exportData("csv")}><Download size={16}/> Exportar CSV</button>
        </div>
      </section>
      {popup && <div className="ref-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setPopup(null); }}>
        <div role="dialog" aria-modal="true" aria-label={popup === "report" ? "Relatórios" : "Configurações"} className="ref-dialog">
          <div className="ref-dialog-head"><h2>{popup === "report" ? "Relatórios financeiros" : "Configurações PRO"}</h2><button type="button" aria-label="Fechar" onClick={() => setPopup(null)}><X size={20}/></button></div>
          {popup === "report" ? <>
            <p>Gere um relatório do mês selecionado usando dados reais do Firestore.</p>
            <label className="ref-label">Incluir<select value={reportType} onChange={e => setReportType(e.target.value)}><option value="ambos">Receitas e despesas</option><option value="receitas">Somente receitas</option><option value="despesas">Somente despesas</option></select></label>
            <button type="button" className="ref-primary" onClick={printReport}><FileText size={16}/> Exportar relatório HTML</button>
            <button type="button" className="ref-secondary" onClick={() => window.print()}><Printer size={16}/> Imprimir tela atual</button>
          </> : <>
            <p>Preferências locais deste navegador.</p>
            <label className="ref-setting"><span><Bell size={16}/> Notificações do navegador</span><input type="checkbox" checked={notifications} onChange={e => e.target.checked ? enableNotifications() : setNotifications(false)}/></label>
            <label className="ref-setting"><span><Volume2 size={16}/> Alertas sonoros (preferência)</span><input type="checkbox" checked={sound} onChange={e => setSound(e.target.checked)}/></label>
            <small>Permissão de notificação habilita o navegador, mas não cria alertas em segundo plano. A opção de som registra a preferência para futura integração.</small>
          </>}
        </div>
      </div>}
    </>
  );
}
