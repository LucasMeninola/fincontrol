import ReferenceDashboard from "./components/ReferenceDashboard.jsx";
import ReferenceFeatures from "./components/ReferenceFeatures.jsx";
import "./reference-features.css";
import React, { useEffect, useMemo, useState } from "react";

import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";

import * as I from "lucide-react";
import { auth, db, configured } from "./firebase";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  PAYMENT_METHODS,
  brl,
  todayISO,
  currentMonth,
  formatDate,
  monthTitle,
  changeMonth,
  addMonths,
  categoryOf,
  statusOf,
  sum,
  defaultItem,
  currencyInput,
  csvCell,
  downloadFile,
  fileToSmallJPEG,
} from "./finance";

const Icon = ({ name, size = 16, ...props }) => {
  const C = I[name] || I.Circle;
  return <C size={size} strokeWidth={1.8} {...props} />;
};

const path = (uid, kind) => collection(db, "users", uid, kind);
const normalize = (r, kind) => ({ ...r, kind, valor: Number(r.valor || 0) });
const getError = (e) =>
  ({
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "permission-denied":
      "Permissão negada: confira as regras do Firestore e o UID do usuário.",
  })[e.code] ||
  e.message ||
  String(e);
function App() {
  const [user, setUser] = useState(null),
    [checking, setChecking] = useState(true),
    [authMode, setAuthMode] = useState("login"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [authBusy, setAuthBusy] = useState(false);
  const [month, setMonth] = useState(currentMonth()),
    [expenses, setExpenses] = useState([]),
    [incomes, setIncomes] = useState([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [tab, setTab] = useState("despesas"),
    [query, setQuery] = useState(""),
    [statusFilter, setStatusFilter] = useState("todos"),
    [categoryFilter, setCategoryFilter] = useState("todos"),
    [methodFilter, setMethodFilter] = useState("todos"),
    [incomeFilter, setIncomeFilter] = useState("todos"),
    [dark, setDark] = useState(
      localStorage.getItem("finalert-theme") === "dark",
    ),
    [modal, setModal] = useState(null),
    [form, setForm] = useState(null),
    [saving, setSaving] = useState(false),
    [trashOpen, setTrashOpen] = useState(false),
    [noticeOpen, setNoticeOpen] = useState(false);

   // =====================================================
  // AUTENTICAÇÃO DO USUÁRIO
  // =====================================================

  // Observa quando o usuário entra ou sai da aplicação.
  useEffect(() => {
    if (!auth) {
      setChecking(false);
      return;
    }
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
  }, []);
  useEffect(() => {
    if (!user || !db) {
      setExpenses([]);
      setIncomes([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let done = 0;
    const unsub = ["despesas", "receitas"].map((kind) =>
      onSnapshot(
        path(user.uid, kind),
        (snap) => {
          const rows = snap.docs.map((d) =>
            normalize({ id: d.id, ...d.data() }, kind),
          );
          if (kind === "despesas") setExpenses(rows);
          else setIncomes(rows);
          done++;
          if (done >= 2) setLoading(false);
          setError("");
        },
        (e) => {
          setError(getError(e));
          setLoading(false);
        },
      ),
    );
    return () => unsub.forEach((f) => f());
  }, [user]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("finalert-theme", dark ? "dark" : "light");
  }, [dark]);

  const alertUser = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 3800);
  };
  const authSubmit = async (e) => {
    e.preventDefault();
    setAuthBusy(true);
    setError("");
    try {
      if (authMode === "reset") {
        await sendPasswordResetEmail(auth, email);
        alertUser("E-mail de recuperação enviado.");
        setAuthMode("login");
      } else if (authMode === "register")
        await createUserWithEmailAndPassword(auth, email, password);
      else await signInWithEmailAndPassword(auth, email, password);
    } catch (e) {
      setError(getError(e));
    } finally {
      setAuthBusy(false);
    }
  };

  // =====================================================
// AUTENTICAÇÃO COM CONTA GOOGLE
// =====================================================
    const loginComGoogle = async () => {
    // Evita iniciar outro login enquanto um está em andamento.
    if (authBusy || !auth) return;

    // Indica que a autenticação começou.
    setAuthBusy(true);
    setError("");

    try {
        // Cria o provedor Google.
        const provider = new GoogleAuthProvider();

        // Abre a janela de login do Google.
        const resultado = await signInWithPopup(auth, provider);

        // Obtém os dados do usuário autenticado.
        const usuario = resultado.user;

        console.log("Login Google realizado com sucesso");
        console.log("Nome:", usuario.displayName);
        console.log("Email:", usuario.email);
    } catch (erro) {
        // O usuário fechou a janela sem concluir.
        if (erro.code === "auth/popup-closed-by-user") {
        return;
        }

        // Exibe mensagens de erro na interface.
        const mensagens = {
        "auth/popup-blocked":
            "O navegador bloqueou a janela de login. Permita pop-ups.",
        "auth/unauthorized-domain":
            "Este domínio não está autorizado no Firebase.",
        "auth/operation-not-allowed":
            "O login Google ainda não foi habilitado no Firebase.",
        "auth/account-exists-with-different-credential":
            "Já existe uma conta com este e-mail. Entre pelo método original para vincular o Google.",
        };

        setError(mensagens[erro.code] || getError(erro));
    } finally {
        // Libera novamente os botões de autenticação.
        setAuthBusy(false);
    }
    };




  const activeExpenses = useMemo(
    () =>
      expenses.filter(
        (r) => !r.excluido && r.vencimento?.slice(0, 7) === month,
      ),
    [expenses, month],
  );
  const activeIncomes = useMemo(
    () =>
      incomes.filter(
        (r) => !r.excluido && (r.data || r.vencimento)?.slice(0, 7) === month,
      ),
    [incomes, month],
  );
  const paid = activeExpenses.filter((r) => r.status === "pago"),
    pending = activeExpenses.filter((r) => statusOf(r) === "pendente"),
    overdue = activeExpenses.filter((r) => statusOf(r) === "atrasado");
  const incomeTotal = sum(activeIncomes),
    expenseTotal = sum(activeExpenses),
    balance = incomeTotal - expenseTotal;
  const visible = useMemo(() => {
    const list = tab === "despesas" ? activeExpenses : activeIncomes;
    return list
      .filter((r) => {
        if (
          query &&
          !`${r.nome} ${r.notas || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())
        )
          return false;
        if (tab === "despesas") {
          if (statusFilter !== "todos" && statusOf(r) !== statusFilter)
            return false;
          if (categoryFilter !== "todos" && r.categoriaId !== categoryFilter)
            return false;
          if (methodFilter !== "todos" && r.forma !== methodFilter)
            return false;
        } else if (incomeFilter !== "todos" && r.categoriaId !== incomeFilter)
          return false;
        return true;
      })
      .sort((a, b) =>
        (a.vencimento || a.data || "").localeCompare(
          b.vencimento || b.data || "",
        ),
      );
  }, [
    tab,
    activeExpenses,
    activeIncomes,
    query,
    statusFilter,
    categoryFilter,
    methodFilter,
    incomeFilter,
  ]);
  const openForm = (kind, row = null) => {
    setForm(
      row ? { ...row, valor: String(row.valor) } : defaultItem(kind, month),
    );
    setModal({ type: "form", kind, id: row?.id || null });
  };
  const saveForm = async (e) => {
    e.preventDefault();
    if (!user) return;
    const value = currencyInput(form.valor);
    if (!form.nome?.trim() || !Number.isFinite(value) || value <= 0) {
      setError("Informe um nome e um valor maior que zero.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const kind = modal.kind;
      const base = {
        nome: form.nome.trim(),
        valor: value,
        categoriaId: form.categoriaId,
        notas: form.notas || "",
        forma: form.forma || "Pix",
        tipo: form.tipo || "unico",
        recorrente: form.tipo === "recorrente",
        vencimento: form.vencimento || form.data,
        data: form.data || form.vencimento,
        status: form.status || "pendente",
        comprovanteBase64: form.comprovanteBase64 || "",
        updatedAt: serverTimestamp(),
      };
      if (modal.id) {
        await updateDoc(doc(db, "users", user.uid, kind, modal.id), base);
      } else if (kind === "despesas" && form.tipo === "parcelado") {
        const n = Math.max(2, Math.min(360, Number(form.parcelasTotal) || 2));
        const batch = writeBatch(db);
        for (let i = 0; i < n; i++) {
          const ref = doc(path(user.uid, kind));
          batch.set(ref, {
            ...base,
            nome: `${base.nome}`,
            valor: Math.round((value / n) * 100) / 100,
            vencimento: addMonths(base.vencimento, i),
            data: addMonths(base.data, i),
            parcela: i + 1,
            parcelasTotal: n,
            tipo: "parcelado",
            status: "pendente",
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      } else {
        await addDoc(path(user.uid, kind), {
          ...base,
          createdAt: serverTimestamp(),
        });
      }
      setModal(null);
      alertUser("Lançamento salvo no Firestore.");
    } catch (e) {
      setError(getError(e));
    } finally {
      setSaving(false);
    }
  };
  const updateStatus = async (row, newStatus, proof = "") => {
    try {
      await updateDoc(doc(db, "users", user.uid, row.kind, row.id), {
        status: newStatus,
        ...(proof ? { comprovanteBase64: proof } : {}),
        updatedAt: serverTimestamp(),
      });
      setModal(null);
      alertUser(
        newStatus === "pago" ? "Pagamento registrado." : "Pagamento desfeito.",
      );
    } catch (e) {
      setError(getError(e));
    }
  };
  const softDelete = async (row) => {
    if (!window.confirm(`Mover "${row.nome}" para a lixeira?`)) return;
    try {
      await updateDoc(doc(db, "users", user.uid, row.kind, row.id), {
        excluido: true,
        updatedAt: serverTimestamp(),
      });
      alertUser("Movido para a lixeira.");
    } catch (e) {
      setError(getError(e));
    }
  };
  const restore = async (row) => {
    try {
      await updateDoc(doc(db, "users", user.uid, row.kind, row.id), {
        excluido: false,
      });
      alertUser("Restaurado.");
    } catch (e) {
      setError(getError(e));
    }
  };
  const permanentlyDelete = async (row) => {
    if (!confirm("Excluir definitivamente este lançamento?")) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, row.kind, row.id));
      alertUser("Excluído definitivamente.");
    } catch (e) {
      setError(getError(e));
    }
  };
  const exportData = (type) => {
    const rows = [...expenses, ...incomes].map(
      ({
        id,
        kind,
        nome,
        valor,
        vencimento,
        data,
        categoriaId,
        forma,
        status,
        tipo,
        notas,
        excluido,
        comprovanteBase64,
      }) => ({
        id,
        kind,
        nome,
        valor,
        vencimento,
        data,
        categoriaId,
        forma,
        status,
        tipo,
        notas,
        excluido,
        comprovanteBase64,
      }),
    );
    if (type === "json")
      downloadFile(
        `finalert-${month}.json`,
        JSON.stringify(
          { version: 1, exportedAt: new Date().toISOString(), rows },
          null,
          2,
        ),
      );
    else {
      const keys = [
        "kind",
        "nome",
        "valor",
        "vencimento",
        "categoriaId",
        "forma",
        "status",
        "tipo",
        "notas",
      ];
      downloadFile(
        `finalert-${month}.csv`,
        "\uFEFF" +
          [
            keys.join(";"),
            ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(";")),
          ].join("\r\n"),
        "text/csv;charset=utf-8",
      );
    }
  };
  const importData = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      if (!Array.isArray(json.rows)) throw Error("Backup inválido.");
      if (!confirm(`Importar ${json.rows.length} lançamentos para sua conta?`))
        return;
      setSaving(true);
      for (let i = 0; i < json.rows.length; i += 400) {
        const batch = writeBatch(db);
        for (const r of json.rows.slice(i, i + 400)) {
          if (
            !["despesas", "receitas"].includes(r.kind) ||
            !r.nome ||
            !Number.isFinite(Number(r.valor))
          )
            continue;
          const { id, kind, ...data } = r;
          batch.set(doc(path(user.uid, kind)), {
            ...data,
            valor: Number(data.valor),
            createdAt: serverTimestamp(),
          });
        }
        await batch.commit();
      }
      alertUser("Backup importado com sucesso.");
    } catch (e) {
      setError(getError(e));
    } finally {
      setSaving(false);
    }
  };
  const next = activeExpenses
    .filter((r) => r.status !== "pago")
    .sort((a, b) => a.vencimento.localeCompare(b.vencimento))
    .slice(0, 5);
  const trash = [...expenses, ...incomes].filter((r) => r.excluido);
  const categoryTotals = EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    total: sum(activeExpenses.filter((r) => r.categoriaId === c.id)),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  const incomeTotals = INCOME_CATEGORIES.map((c) => ({
    ...c,
    total: sum(activeIncomes.filter((r) => r.categoriaId === c.id)),
  }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
  
    const categoryButton = (c, selected, click) => (
    <button
      key={c.id}
      className={`chip ${selected ? "selected" : ""}`}
      onClick={click}
      type="button"
    >
      <Icon name={c.icon} size={13} />
      {c.label}
    </button>
  );
  if (!configured)
    return (
      <div className="center-page">
        <div className="login-card">
          <h1>FinAlert</h1>
          <p>
            Configure o arquivo <code>.env</code> com as credenciais do Firebase
            e reinicie o Vite.
          </p>
          <p>Veja o README.md para as instruções.</p>
        </div>
      </div>
    );
  if (checking)
    return <div className="center-page">Conectando ao Firebase…</div>;
  
  if (!user)
    return (
      <div className="center-page">
        <form className="login-card" onSubmit={authSubmit}>
          <div className="brand">
            {/* Logotipo personalizado do FinControl */}
            <div className="logo">
            <img
                src="/formiga.svg"
                alt="Logotipo FinControl"
                className="logo-image"
            />
            </div>
            <div>
              <strong>FinControl</strong>
            </div>
          </div>

          {error && <div className="error">{error}</div>}

            {/* =====================================================
                LOGIN COM GOOGLE
                Aparece somente na tela de login.
                ===================================================== */}
            {authMode === "login" && (
            <button
                type="button"
                className="btn google-login full"
                onClick={loginComGoogle}
                disabled={authBusy}
            >
                <span className="google-icon">G</span>
                {authBusy ? "Conectando..." : "Login com Google"}
            </button>
            )}

            {/* Separador entre login tradicional e Google */}
            <div className="login-separator">
            <div className="separator-line"></div>
            <span>ou</span>
            <div className="separator-line"></div>
            </div>


          <label>
            E-mail
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
            />
          </label>
          {authMode !== "reset" && (
            <label>
              Senha
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Sua senha"
              />
            </label>
          )}
          <button className="btn primary full" disabled={authBusy}>
            {authBusy
              ? "Aguarde…"
              : authMode === "register"
                ? "Criar conta"
                : authMode === "reset"
                  ? "Enviar recuperação"
                  : "Entrar"}
          </button>

          <div className="login-links">
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "register" ? "login" : "register");
                setError("");
              }}
            >
              {authMode === "register" ? "Já tenho conta" : "Criar conta"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === "reset" ? "login" : "reset");
                setError("");
              }}>
              {authMode === "reset" ? "Voltar ao login" : "Esqueci a senha"}
            </button>
            </div>
        </form>
      </div>
    );
  return (
    <>
      <header className="topbar">
        <div className="top-inner">
          <div className="brand">
            {/* Logotipo personalizado do FinControl */}
            <div className="logo">
            <img
                src="/formiga.svg"
                alt="Logotipo FinControl"
                className="logo-image"
            />
            </div>
            <div>
              <div>
                <strong>FinControl</strong>
                <span className="tag">PRO</span>
              </div>
              <small>saldo cruzado receitas × despesas</small>
            </div>
          </div>
          <div className="month-nav">
            <button onClick={() => setMonth(changeMonth(month, -1))}>
              <Icon name="ChevronLeft" />
            </button>
            <span>{monthTitle(month)}</span>
            <button onClick={() => setMonth(changeMonth(month, 1))}>
              <Icon name="ChevronRight" />
            </button>
          </div>
          <div className="search">
            <Icon name="Search" size={15} />
            <input
              placeholder="Buscar despesa..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="toolbar">
            <button onClick={() => exportData("csv")}>
              <Icon name="FileDown" /> <span>CSV</span>
            </button>
            <button onClick={() => exportData("json")}>
              <Icon name="FileJson" /> <span>JSON</span>
            </button>
            <label className="toolbar-button">
              <Icon name="Upload" /> <span>Import</span>
              <input
                type="file"
                accept="application/json,.json"
                hidden
                onChange={importData}
              />
            </label>
            <button title="Lixeira" onClick={() => setTrashOpen(true)}>
              <Icon name="Trash2" />
            </button>
            <button title="Tema" onClick={() => setDark(!dark)}>
              <Icon name={dark ? "Sun" : "Moon"} />
            </button>
            <button title="Alertas" onClick={() => setNoticeOpen(!noticeOpen)}>
              <Icon name="Bell" />
              {overdue.length > 0 && <b className="notif">{overdue.length}</b>}
            </button>
          </div>
          <div className="profile">
            <div className="avatar">{(user.email || "U")[0].toUpperCase()}</div>
            <div>
              <b>{user.displayName || user.email?.split("@")[0]}</b>
              <small>{user.email}</small>
            </div>
          </div>
          <button className="logout" onClick={() => signOut(auth)} title="Sair">
            <Icon name="LogOut" />
          </button>
        </div>
      </header>
      <main className="page">
        {error && (
          <div className="error error-main">
            {error}
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        {noticeOpen && (
          <div className="notice">
            {overdue.length} contas atrasadas em {monthTitle(month)}.{" "}
            <button onClick={() => setNoticeOpen(false)}>Fechar</button>
          </div>
        )}
        <ReferenceDashboard
          month={month}
          expenses={expenses}
          incomes={incomes}
          pending={pending}
          overdue={overdue}
          paid={paid}
          onAddExpense={() => openForm("despesas")}
          onAddIncome={() => openForm("receitas")}
        />
        <div className="dashboard">
          <aside className="left-col">
            <section className="panel">
              <h3>
                Resumo do mês <Icon name="Sparkles" size={16} />
              </h3>
              {[
                {
                  name: "PENDENTE",
                  value: sum(pending),
                  className: "summary-pending",
                },
                { name: "PAGO", value: sum(paid), className: "summary-paid" },
                {
                  name: "ATRASADO",
                  value: sum(overdue),
                  className: "summary-overdue",
                },
                {
                  name: "RECEITAS",
                  value: incomeTotal,
                  className: "summary-income",
                },
                { name: "SALDO", value: balance, className: "summary-income" },
              ].map((x) => (
                <div className={`summary ${x.className}`} key={x.name}>
                  <small>{x.name}</small>
                  <b>{brl(x.value)}</b>
                </div>
              ))}
              <p className="muted footnote">
                <Icon name="Clock" size={12} /> Total despesas{" "}
                {brl(expenseTotal)} • {activeExpenses.length} contas •{" "}
                {activeIncomes.length} rendas
              </p>
            </section>
            <section className="panel">
              <h3>
                <span>
                  <Icon name="CalendarDays" /> Calendário mini
                </span>
                <small>
                  {new Date(
                    Number(month.slice(0, 4)),
                    Number(month.slice(5, 7)),
                    0,
                  ).getDate()}{" "}
                  dias
                </small>
              </h3>
              <div className="calendar">
                {["D", "S", "T", "Q", "Q", "S", "S"].map((x, i) => (
                  <span className="dayhead" key={i}>
                    {x}
                  </span>
                ))}
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5, 7)) - 1,
                      1,
                    ).getDay(),
                  },
                  (_, i) => (
                    <span key={"empty" + i} />
                  ),
                )}
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5, 7)),
                      0,
                    ).getDate(),
                  },
                  (_, i) => {
                    const day = String(i + 1).padStart(2, "0"),
                      date = month + "-" + day,
                      hasLate = activeExpenses.some(
                        (r) =>
                          r.vencimento === date && statusOf(r) === "atrasado",
                      ),
                      hasPending = activeExpenses.some(
                        (r) =>
                          r.vencimento === date && statusOf(r) === "pendente",
                      ),
                      hasPaid = activeExpenses.some(
                        (r) => r.vencimento === date && r.status === "pago",
                      );
                    return (
                      <span
                        key={day}
                        className={`day ${date === todayISO() ? "today" : ""}`}
                      >
                        {i + 1}
                        {(hasLate || hasPending || hasPaid) && (
                          <i
                            style={{
                              background: hasLate
                                ? "#ef4444"
                                : hasPending
                                  ? "#f59e0b"
                                  : "#16a34a",
                            }}
                          />
                        )}
                      </span>
                    );
                  },
                )}
              </div>
              <div className="legend">
                <span>🔴 atrasado</span>
                <span>🟠 pendente</span>
                <span>🟢 pago</span>
              </div>
            </section>
            <section className="panel">
              <h3>
                <span>
                  <Icon name="SlidersHorizontal" /> Filtros
                </span>
              </h3>
              <p className="filter-label">STATUS DESPESAS</p>
              <div className="chips">
                {[
                  ["todos", "Todos"],
                  ["pendente", "Pendentes"],
                  ["pago", "Pagos"],
                  ["atrasado", "Atrasados"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    className={`chip ${statusFilter === v ? "selected" : ""}`}
                    onClick={() => {
                      setStatusFilter(v);
                      setTab("despesas");
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <p className="filter-label">CATEGORIAS DESPESAS</p>
              <div className="chips">
                <button
                  className={`chip ${categoryFilter === "todos" ? "selected" : ""}`}
                  onClick={() => setCategoryFilter("todos")}
                >
                  Todas
                </button>
                {EXPENSE_CATEGORIES.slice(0, 7).map((c) =>
                  categoryButton(c, categoryFilter === c.id, () => {
                    setCategoryFilter(c.id);
                    setTab("despesas");
                  }),
                )}
              </div>
              <p className="filter-label">FORMA PIX/BOLETO/CARTÃO/DINHEIRO</p>
              <div className="chips">
                <button
                  className={`chip ${methodFilter === "todos" ? "selected" : ""}`}
                  onClick={() => setMethodFilter("todos")}
                >
                  Todas
                </button>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    className={`chip ${methodFilter === m ? "selected" : ""}`}
                    key={m}
                    onClick={() => setMethodFilter(m)}
                  >
                    {m}
                  </button>
                ))}
              </div>
              <hr />
              <p className="filter-label">CATEGORIAS RECEITAS</p>
              <div className="chips">
                <button
                  className={`chip ${incomeFilter === "todos" ? "selected green-selected" : ""}`}
                  onClick={() => {
                    setIncomeFilter("todos");
                    setTab("receitas");
                  }}
                >
                  Todas rendas
                </button>
                {INCOME_CATEGORIES.map((c) =>
                  categoryButton(c, incomeFilter === c.id, () => {
                    setIncomeFilter(c.id);
                    setTab("receitas");
                  }),
                )}
              </div>
            </section>
          </aside>
          <section className="middle-col">
            <div className="list-header">
              <div className="tabs">
                <button
                  className={tab === "despesas" ? "active" : ""}
                  onClick={() => setTab("despesas")}
                >
                  <Icon name="Receipt" /> Despesas • {activeExpenses.length}
                </button>
                <button
                  className={tab === "receitas" ? "active" : ""}
                  onClick={() => setTab("receitas")}
                >
                  <Icon name="Wallet" /> Receitas • {activeIncomes.length}
                </button>
              </div>
              <div className="list-badges">
                <span>
                  {pending.length + overdue.length} pendentes no geral
                </span>
                <b>Saldo {brl(balance)}</b>
              </div>
            </div>
            {loading ? (
              <div className="empty">Carregando dados do Firestore…</div>
            ) : visible.length === 0 ? (
              <div className="empty">
                <Icon name="Inbox" size={36} />
                <h3>Nenhum lançamento encontrado</h3>
                <p>
                  Adicione sua primeira{" "}
                  {tab === "despesas" ? "despesa" : "receita"} ou altere os
                  filtros.
                </p>
                <button className="btn primary" onClick={() => openForm(tab)}>
                  Novo lançamento
                </button>
              </div>
            ) : (
              visible.map((r) => {
                const c = categoryOf(r.kind, r.categoriaId),
                  st = r.kind === "despesas" ? statusOf(r) : "receita";
                return (
                  <article
                    className="entry"
                    key={r.id}
                    style={{ "--entry-color": c.color }}
                  >
                    <div
                      className="entry-icon"
                      style={{ background: c.bg, color: c.color }}
                    >
                      <Icon name={c.icon} size={19} />
                    </div>
                    <div className="entry-main">
                      <div className="entry-title">
                        <strong>{r.nome}</strong>
                        {r.tipo === "recorrente" && (
                          <span className="pill">⇄ recorrente</span>
                        )}
                        {r.tipo === "parcelado" && (
                          <span className="pill">
                            {r.parcela || 1}/{r.parcelasTotal || 2}
                          </span>
                        )}
                        {r.kind === "despesas" && (
                          <span className={`pill ${st}`}>{st}</span>
                        )}
                      </div>
                      <div className="entry-meta">
                        <span>
                          <Icon name="CalendarDays" size={12} />
                          {formatDate(r.vencimento || r.data)}
                        </span>
                        <span>
                          <Icon name="Wallet" size={12} />
                          {r.forma || "Pix"}
                        </span>
                        <span style={{ color: c.color }}>●</span>
                        <span>{c.label}</span>
                        {r.notas && <span>• {r.notas}</span>}
                      </div>
                      <div className="entry-actions">
                        {r.kind === "despesas" && (
                          <button
                            className="action-dark"
                            onClick={() =>
                              r.status === "pago"
                                ? updateStatus(r, "pendente")
                                : setModal({ type: "pay", row: r })
                            }
                          >
                            <Icon
                              name={r.status === "pago" ? "X" : "Check"}
                              size={13}
                            />
                            {r.status === "pago" ? "Desfazer" : "Pagar"}
                          </button>
                        )}
                        <button onClick={() => openForm(r.kind, r)}>
                          Editar
                        </button>
                        <button
                          className="icon-action"
                          title="Mover para lixeira"
                          onClick={() => softDelete(r)}
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </div>
                    <strong className="entry-value">{brl(r.valor)}</strong>
                  </article>
                );
              })
            )}
          </section>
          <aside className="right-col">
            <ReferenceFeatures month={month} expenses={expenses} incomes={incomes} exportData={exportData} />
            <section className="panel">
              <h3>
                <span>
                  <Icon name="Bell" /> Próximos vencimentos
                </span>
              </h3>
              {next.length ? (
                next.map((r) => {
                  const c = categoryOf("despesas", r.categoriaId);
                  return (
                    <div className="upcoming" key={r.id}>
                      <div className="up-icon" style={{ background: c.color }}>
                        <Icon name={c.icon} size={16} />
                      </div>
                      <div>
                        <b>{r.nome}</b>
                        <small>
                          {formatDate(r.vencimento)} • {brl(r.valor)}
                        </small>
                      </div>
                      <i />
                    </div>
                  );
                })
              ) : (
                <p className="muted">Nenhuma conta pendente.</p>
              )}
            </section>
            <section className="panel">
              <h3>
                <span>
                  <Icon name="Wallet" /> Receitas por fonte
                </span>
              </h3>
              {incomeTotals.length ? (
                incomeTotals.map((c) => (
                  <div className="bar-row" key={c.id}>
                    <div>
                      <span>
                        <Icon name={c.icon} size={13} />
                        {c.label}
                      </span>
                      <b>{brl(c.total)}</b>
                    </div>
                    <div className="bar-bg">
                      <i
                        style={{
                          width: `${incomeTotal ? (c.total / incomeTotal) * 100 : 0}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">Sem receitas neste mês.</p>
              )}
            </section>
            <section className="panel">
              <h3>Despesas por categoria</h3>
              {categoryTotals.length ? (
                categoryTotals.map((c) => (
                  <div className="bar-row" key={c.id}>
                    <div>
                      <span>
                        <Icon name={c.icon} size={13} />
                        {c.label}
                      </span>
                      <b>{brl(c.total)}</b>
                    </div>
                    <div className="bar-bg">
                      <i
                        style={{
                          width: `${expenseTotal ? (c.total / expenseTotal) * 100 : 0}%`,
                          background: c.color,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="muted">Sem despesas neste mês.</p>
              )}
            </section>
            {/* <section className="panel tip">
              <h3>
                <span>
                  <Icon name="ArrowUpRight" /> Dica saldo Firebase
                </span>
              </h3>
              <p>
                Em produção: <code>users/{"{uid}"}/despesas</code>,{" "}
                <code>receitas</code> com UID isolado. Regras:{" "}
                <code>request.auth.uid == userId</code>.
              </p>
              <div className="tip-actions">
                <button onClick={() => exportData("json")}>Backup JSON</button>
                <button onClick={() => exportData("csv")}>Export CSV</button>
              </div>
              <small>
                Sincronização real com Firestore • sem dados mockados
              </small>
            </section> */}
          </aside>
        </div>
        <footer>
          FinAlert com Receitas • saldo {brl(balance)} • receitas:{" "}
          {activeIncomes.length} • despesas: {activeExpenses.length} • tema:{" "}
          {dark ? "escuro" : "claro"} • Firebase Firestore
        </footer>
      </main>
      <div className="floating">
        <button className="float-expense" onClick={() => openForm("despesas")}>
          <Icon name="Minus" />
          <Icon name="HandCoins" /> Despesa
        </button>
        <button className="float-income" onClick={() => openForm("receitas")}>
          <Icon name="Plus" />
          <Icon name="Wallet" /> Receita
        </button>
      </div>
      {toast && (
        <div className="toast">
          <Icon name="CheckCircle" />
          {toast}
        </div>
      )}
      {trashOpen && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setTrashOpen(false);
          }}
        >
          <div className="dialog">
            <div className="dialog-head">
              <h2>Lixeira</h2>
              <button onClick={() => setTrashOpen(false)}>
                <Icon name="X" />
              </button>
            </div>
            <div className="dialog-body">
              {trash.length === 0 ? (
                <p>Nenhum lançamento na lixeira.</p>
              ) : (
                trash.map((r) => (
                  <div className="trash-row" key={r.id}>
                    <span>
                      {r.nome} • {brl(r.valor)}
                    </span>
                    <button onClick={() => restore(r)}>Restaurar</button>
                    <button onClick={() => permanentlyDelete(r)}>
                      Excluir
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {modal?.type === "pay" && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="dialog">
            <div className="dialog-head">
              <div>
                <h2>Confirmar pagamento</h2>
                <p>
                  {modal.row.nome} • {brl(modal.row.valor)}
                </p>
              </div>
              <button onClick={() => setModal(null)}>
                <Icon name="X" />
              </button>
            </div>
            <div className="dialog-body">
              <p>Deseja marcar esta despesa como paga?</p>
              <label className="file-label">
                Comprovante (foto opcional)
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    try {
                      const data = await fileToSmallJPEG(e.target.files[0]);
                      setModal({ ...modal, proof: data });
                    } catch (err) {
                      setError(getError(err));
                    }
                  }}
                />
              </label>
              <button
                className="btn primary full"
                onClick={() => updateStatus(modal.row, "pago", modal.proof)}
              >
                Confirmar pagamento
              </button>
            </div>
          </div>
        </div>
      )}
      {modal?.type === "form" && (
        <div
          className="overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <form className="dialog" onSubmit={saveForm}>
            <div className="dialog-head">
              <div>
                <h2>
                  {modal.id
                    ? "Editar"
                    : modal.kind === "despesas"
                      ? "Nova despesa"
                      : "Nova receita"}
                </h2>
                <p>
                  Comprovante foto, parcelado livre 2–360, recorrente •
                  Firestore
                </p>
              </div>
              <button type="button" onClick={() => setModal(null)}>
                <Icon name="X" />
              </button>
            </div>
            <div className="dialog-body">
              <label>
                Nome *
                <input
                  required
                  placeholder="Ex: Aluguel, Mercado..."
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                />
              </label>
              <div className="two-fields">
                <label>
                  Valor *
                  <input
                    required
                    inputMode="decimal"
                    placeholder="0,00"
                    value={form.valor}
                    onChange={(e) =>
                      setForm({ ...form, valor: e.target.value })
                    }
                  />
                </label>
                <label>
                  {modal.kind === "despesas" ? "Vencimento" : "Data"} *
                  <input
                    type="date"
                    required
                    value={
                      modal.kind === "despesas" ? form.vencimento : form.data
                    }
                    onChange={(e) =>
                      setForm({
                        ...form,
                        [modal.kind === "despesas" ? "vencimento" : "data"]:
                          e.target.value,
                      })
                    }
                  />
                </label>
              </div>
              <div className="field-title">Categoria (cor + ícone)</div>
              <div className="option-grid">
                {(modal.kind === "despesas"
                  ? EXPENSE_CATEGORIES
                  : INCOME_CATEGORIES
                ).map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    className={`option ${form.categoriaId === c.id ? "selected" : ""}`}
                    onClick={() => setForm({ ...form, categoriaId: c.id })}
                  >
                    <Icon name={c.icon} size={21} />
                    {c.label}
                  </button>
                ))}
              </div>
              {/* <div className="field-title">
                Forma Pix/Boleto/Cartão/Dinheiro
              </div>
              <div className="option-grid methods">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    type="button"
                    className={`option ${form.forma === m ? "selected" : ""}`}
                    key={m}
                    onClick={() => setForm({ ...form, forma: m })}
                  >
                    {m}
                  </button>
                ))}
              </div> */}
              {modal.kind === "despesas" && (
                <>
                  <div className="field-title">Tipo</div>
                  <div className="option-grid types">
                    {[
                      ["unico", "Única"],
                      ["recorrente", "Recorrente ♻"],
                      ["parcelado", "Parcelado 2–360"],
                    ].map(([v, l]) => (
                      <button
                        type="button"
                        key={v}
                        className={`option ${form.tipo === v ? "selected" : ""}`}
                        onClick={() => setForm({ ...form, tipo: v })}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                  {form.tipo === "parcelado" && !modal.id && (
                    <label>
                      Número de parcelas
                      <input
                        type="number"
                        min="2"
                        max="360"
                        value={form.parcelasTotal}
                        onChange={(e) =>
                          setForm({ ...form, parcelasTotal: e.target.value })
                        }
                      />
                    </label>
                  )}

                {form.tipo === "recorrente" && !modal.id && (
                <label>
                    Repetir por quantos meses?
                    <input
                    type="number"
                    min="1"
                    max="360"
                    value={form.recorrenciasTotal ?? 12}
                    onChange={(e) =>
                        setForm({
                        ...form,
                        recorrenciasTotal: e.target.value,
                        })
                    }
                    />
                </label>
                )}

                </>
              )}
              <label>
                Notas
                <textarea
                  placeholder="Observações..."
                  rows="3"
                  value={form.notas}
                  onChange={(e) => setForm({ ...form, notas: e.target.value })}
                />
              </label>
              <label className="file-label">
                Comprovante foto (armazenado no documento Firestore)
                <input
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    try {
                      const data = await fileToSmallJPEG(e.target.files[0]);
                      setForm({ ...form, comprovanteBase64: data });
                      alertUser("Foto preparada. Salve o lançamento.");
                    } catch (err) {
                      setError(getError(err));
                    }
                  }}
                />
              </label>
              {form.comprovanteBase64 && (
                <small className="muted">✓ Comprovante anexado</small>
              )}
              <button className="btn primary full" disabled={saving}>
                {saving
                  ? "Salvando…"
                  : modal.id
                    ? "Salvar alterações"
                    : "Adicionar " +
                      (modal.kind === "despesas" ? "despesa" : "receita")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}


export default App;
