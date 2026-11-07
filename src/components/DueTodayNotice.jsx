import React, { useEffect, useState } from "react";
import { Bell, BellRing, CalendarClock, Check, X } from "lucide-react";
import { brl, todayISO } from "../finance";
import "./DueTodayNotice.css";

const eligible = (r,date) => !r.excluido && r.status !== "pago" && r.vencimento === date;

// Aviso durante o uso do app. Push com o app fechado exigiria backend + Service Worker.
export default function DueTodayNotice({ user, expenses, loading }) {
  const [date,setDate] = useState(todayISO);
  const [dismissed,setDismissed] = useState(false);
  const [permission,setPermission] = useState(
    () => typeof Notification !== "undefined" ? Notification.permission : "unsupported"
  );
  useEffect(() => {
    const refresh = () => setDate(todayISO());
    const timer = setInterval(refresh,60000);
    document.addEventListener("visibilitychange",refresh);
    window.addEventListener("focus",refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange",refresh);
      window.removeEventListener("focus",refresh);
    };
  },[]);
  useEffect(()=>setDismissed(false),[date,user?.uid]);
  const due = user && !loading ? expenses.filter(row=>eligible(row,date)) : [];
  const sum = due.reduce((v,row)=>v+Number(row.valor||0),0);
  const key = user ? "fincontrol-due-"+user.uid+"-"+date : null;
  useEffect(()=>{
    if(!key || !due.length || permission!=="granted" || !("Notification" in window)) return;
    if(localStorage.getItem(key)==="sent") return;
    try {
      const notification = new Notification("FinControl • Conta vence hoje",{
        body: due.length===1 ? (due[0].nome+" — "+brl(due[0].valor)) : due.length+" contas vencem hoje • "+brl(sum),
        icon: import.meta.env.BASE_URL+"formiga.svg",
        tag:key
      });
      notification.onclick=()=>{window.focus();notification.close();};
      localStorage.setItem(key,"sent");
    } catch(err) { console.warn("Notificação indisponível neste navegador",err); }
  },[key,permission,due.length,sum]);
  const allow = async()=>{
    if(typeof Notification==="undefined")return;
    try { const result=await Notification.requestPermission();setPermission(result); }
    catch(err){console.warn("Permissão de notificação falhou",err);}
  };
  if(!user || loading || !due.length || dismissed)return null;
  return <section className="fc-due-alert" role="status" aria-live="polite">
    <span className="fc-due-alert-icon"><BellRing size={19}/></span>
    <div className="fc-due-alert-body">
      <strong>{due.length===1 ? "Você tem 1 conta vencendo hoje" : "Você tem "+due.length+" contas vencendo hoje"}</strong>
      <p>{due.slice(0,3).map(r=>r.nome).join(", ")}{due.length>3?" e outras":""} • Total: {brl(sum)}</p>
      {permission==="default" && <button type="button" className="fc-due-permission" onClick={allow}><Bell size={14}/> Ativar notificações do navegador</button>}
      {permission==="denied" && <small className="fc-due-help">Notificações bloqueadas. Habilite nas configurações do navegador para receber avisos com o app aberto.</small>}
    </div>
    <button type="button" className="fc-due-close" onClick={()=>setDismissed(true)} title="Dispensar aviso" aria-label="Dispensar aviso"><X size={17}/></button>
  </section>;
}
