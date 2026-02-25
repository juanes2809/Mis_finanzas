import { useState, useEffect, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// ── STORAGE (localStorage) ────────────────────────────────────────────────────
function load(key) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; }
}
function save(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

// ── DEFAULTS ─────────────────────────────────────────────────────────────────
const DEFAULT_CATS = [
  { id: "c1", name: "Comida", icon: "🍔", color: "#e07a5f", type: "expense" },
  { id: "c2", name: "Transporte", icon: "🚌", color: "#3d405b", type: "expense" },
  { id: "c3", name: "Entretenimiento", icon: "🎮", color: "#81b29a", type: "expense" },
  { id: "c4", name: "Salud", icon: "💊", color: "#f2cc8f", type: "expense" },
  { id: "c5", name: "Ropa", icon: "👕", color: "#a8dadc", type: "expense" },
  { id: "c6", name: "Hogar", icon: "🏠", color: "#c77dff", type: "expense" },
  { id: "c7", name: "Salario", icon: "💼", color: "#52b788", type: "income" },
  { id: "c8", name: "Freelance", icon: "💻", color: "#74c69d", type: "income" },
  { id: "c9", name: "Otros ingresos", icon: "💰", color: "#b7e4c7", type: "income" },
];
const DEFAULT_GOALS = [
  { id: "g1", name: "Flores 💐", emoji: "💐", percentage: 5, period: "weekly", source: "all", color: "#f77f9e" },
  { id: "g2", name: "Ahorro personal", emoji: "🐷", percentage: 15, period: "monthly", source: "all", color: "#52b788" },
];

// ── UTILS ─────────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const uid = () => Math.random().toString(36).slice(2);

// ── ZONA HORARIA COLOMBIA (UTC-5) ─────────────────────────────────────────────
// Evita el bug donde a las 7pm-11pm en Colombia ya es "mañana" en UTC
const TZ = "America/Bogota";

// Fecha de hoy en Colombia → "YYYY-MM-DD"
function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

// Prefijo mes actual en Colombia → "YYYY-MM"
function monthPrefix() {
  return today().slice(0, 7);
}

// Rango de la semana (lunes-domingo) con offset de semanas, todo en Colombia
function getWeekRange(offset = 0) {
  const t = today();
  const [y, m, d] = t.split("-").map(Number);
  const base = new Date(y, m - 1, d);
  const day = base.getDay(); // 0=dom
  const toMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + toMon + offset * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toStr = dt =>
    `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")}`;
  return { mondayStr: toStr(monday), sundayStr: toStr(sunday), monday, sunday };
}

function inRange(dateStr, mondayStr, sundayStr) {
  return dateStr >= mondayStr && dateStr <= sundayStr;
}

function weekLabel(monday, sunday) {
  const o = { day: "numeric", month: "short" };
  return `${monday.toLocaleDateString("es", o)} – ${sunday.toLocaleDateString("es", o)}`;
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 50%, #16213e 100%)",
    fontFamily: "'DM Sans', sans-serif",
    color: "#f0ece3",
    padding: "0 0 80px 0",
  },
  header: {
    padding: "28px 24px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.03)",
    backdropFilter: "blur(12px)",
    position: "sticky", top: 0, zIndex: 100,
  },
  headerTitle: {
    fontSize: "22px", fontWeight: 700, letterSpacing: "-0.5px",
    background: "linear-gradient(90deg, #f2cc8f, #e07a5f)",
    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
  },
  headerSub: { fontSize: "12px", color: "rgba(240,236,227,0.5)", marginTop: 2 },
  tabsWrapper: {
    overflowX: "auto", WebkitOverflowScrolling: "touch",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
    background: "rgba(255,255,255,0.02)",
    position: "sticky", top: "73px", zIndex: 99,
  },
  tabs: { display: "flex", gap: "4px", padding: "12px 16px 0", minWidth: "max-content" },
  tab: (active) => ({
    padding: "8px 14px", borderRadius: "10px 10px 0 0",
    border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600,
    transition: "all 0.2s", whiteSpace: "nowrap",
    background: active ? "rgba(242,204,143,0.15)" : "transparent",
    color: active ? "#f2cc8f" : "rgba(240,236,227,0.45)",
    borderBottom: active ? "2px solid #f2cc8f" : "2px solid transparent",
  }),
  page: { padding: "20px 16px" },
  card: {
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: "16px", padding: "16px", marginBottom: "14px",
    backdropFilter: "blur(8px)",
  },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" },
  statCard: (c) => ({
    background: `linear-gradient(135deg, ${c}22, ${c}11)`,
    border: `1px solid ${c}44`, borderRadius: "14px", padding: "14px",
  }),
  statLabel: { fontSize: "11px", color: "rgba(240,236,227,0.55)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.5px" },
  statVal: { fontSize: "22px", fontWeight: 700, marginTop: "4px" },
  sectionTitle: { fontSize: "15px", fontWeight: 700, marginBottom: "12px", color: "#f2cc8f" },
  input: {
    width: "100%", padding: "10px 12px", borderRadius: "10px", fontSize: "14px",
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
    color: "#f0ece3", outline: "none", boxSizing: "border-box",
  },
  select: {
    width: "100%", padding: "10px 12px", borderRadius: "10px", fontSize: "14px",
    background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.12)",
    color: "#f0ece3", outline: "none", boxSizing: "border-box",
  },
  label: { fontSize: "12px", color: "rgba(240,236,227,0.55)", marginBottom: "5px", display: "block", fontWeight: 500 },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  btn: (color = "#f2cc8f", text = "#1a1a2e") => ({
    padding: "11px 20px", borderRadius: "10px", border: "none", cursor: "pointer",
    fontWeight: 700, fontSize: "14px", background: color, color: text,
    transition: "opacity 0.2s", width: "100%", marginTop: "10px",
  }),
  btnSm: (color = "#f2cc8f", text = "#1a1a2e") => ({
    padding: "7px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
    fontWeight: 600, fontSize: "12px", background: color, color: text,
  }),
  txItem: {
    display: "flex", alignItems: "center", gap: "12px",
    padding: "12px 14px", borderRadius: "12px", marginBottom: "8px",
    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
  },
  badge: (c) => ({
    fontSize: "10px", fontWeight: 700, padding: "3px 8px",
    borderRadius: "6px", background: `${c}33`, color: c,
  }),
  goalBar: (pct, c) => ({
    height: "6px", borderRadius: "3px",
    background: `linear-gradient(90deg, ${c}, ${c}88)`,
    width: `${Math.min(pct, 100)}%`, transition: "width 0.6s ease",
  }),
  pill: (active, c) => ({
    padding: "6px 14px", borderRadius: "20px", border: `2px solid ${active ? c : "rgba(255,255,255,0.12)"}`,
    background: active ? `${c}22` : "transparent", color: active ? c : "rgba(240,236,227,0.5)",
    cursor: "pointer", fontSize: "13px", fontWeight: 600,
  }),
  modal: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200,
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  },
  modalBox: {
    background: "#1a1a2e", borderRadius: "20px 20px 0 0",
    padding: "24px 20px 40px", width: "100%", maxWidth: "480px",
    border: "1px solid rgba(255,255,255,0.1)", maxHeight: "90vh", overflowY: "auto",
  },
};

// ── FAB ───────────────────────────────────────────────────────────────────────
function Fab({ onClick }) {
  return (
    <button onClick={onClick} style={{
      position: "fixed", bottom: "24px", right: "20px", zIndex: 150,
      width: "56px", height: "56px", borderRadius: "50%", border: "none",
      background: "linear-gradient(135deg, #f2cc8f, #e07a5f)",
      fontSize: "26px", cursor: "pointer", boxShadow: "0 4px 20px rgba(224,122,95,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>+</button>
  );
}

// ── ADD TRANSACTION MODAL ─────────────────────────────────────────────────────
function AddTxModal({ cats, onSave, onClose }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [catId, setCatId] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today());
  const filteredCats = cats.filter(c => c.type === type);
  const handleSave = () => {
    if (!amount || !catId) return alert("Monto y categoría son obligatorios");
    onSave({ id: uid(), type, amount: parseFloat(amount), catId, reason, date });
    onClose();
  };
  return (
    <div style={S.modal} onClick={onClose}>
      <div style={S.modalBox} onClick={e => e.stopPropagation()}>
        <h3 style={{ fontWeight: 700, fontSize: "18px", marginBottom: "16px" }}>
          {type === "expense" ? "🔴 Nuevo Gasto" : "🟢 Nuevo Ingreso"}
        </h3>
        <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
          {["expense", "income"].map(t => (
            <button key={t} style={S.pill(type === t, t === "expense" ? "#e07a5f" : "#52b788")}
              onClick={() => { setType(t); setCatId(""); }}>
              {t === "expense" ? "Gasto" : "Ingreso"}
            </button>
          ))}
        </div>
        <div style={S.formGrid}>
          <div>
            <label style={S.label}>Monto ($)</label>
            <input style={S.input} type="number" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div>
            <label style={S.label}>Fecha</label>
            <input style={S.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        <div style={{ marginTop: "10px" }}>
          <label style={S.label}>Categoría</label>
          <select style={S.select} value={catId} onChange={e => setCatId(e.target.value)}>
            <option value="">Selecciona...</option>
            {filteredCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
          </select>
        </div>
        <div style={{ marginTop: "10px" }}>
          <label style={S.label}>Motivo / Descripción</label>
          <input style={S.input} placeholder={type === "expense" ? "¿Para qué fue?" : "¿De dónde viene?"} value={reason} onChange={e => setReason(e.target.value)} />
        </div>
        <button style={S.btn(type === "expense" ? "#e07a5f" : "#52b788")} onClick={handleSave}>
          Guardar {type === "expense" ? "gasto" : "ingreso"}
        </button>
        <button style={{ ...S.btn("rgba(255,255,255,0.08)", "#f0ece3"), marginTop: "6px" }} onClick={onClose}>Cancelar</button>
      </div>
    </div>
  );
}

// ── DASHBOARD TAB ─────────────────────────────────────────────────────────────
function Dashboard({ txs, cats, goals }) {
  const monthTxs = txs.filter(t => t.date.startsWith(monthPrefix()));
  const totalIncome  = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = monthTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);

  // Calcular total apartado en metas (mensual) — se descuenta del disponible
  const goalsData = goals.map(g => {
    const base = g.source === "all" ? totalIncome
      : monthTxs.filter(t => t.type === "income" && t.catId === g.source).reduce((s, t) => s + t.amount, 0);
    // Para metas semanales, multiplicar por semanas del mes (~4.33); diario por ~30
    const multiplier = g.period === "weekly" ? 4.33 : g.period === "daily" ? 30 : 1;
    const target = base * (g.percentage / 100) * (g.period === "monthly" ? 1 : 0);
    // Solo descontamos metas mensuales directo; semanales/diarias se muestran como referencia
    const monthlyEquiv = g.period === "monthly" ? base * (g.percentage / 100) : 0;
    return { ...g, base, monthlyEquiv };
  });
  const totalReserved = goalsData.reduce((s, g) => s + g.monthlyEquiv, 0);
  // Disponible real = ingresos - gastos - lo apartado en metas
  const disponible = totalIncome - totalExpense - totalReserved;

  const expCats = {};
  monthTxs.filter(t => t.type === "expense").forEach(t => { expCats[t.catId] = (expCats[t.catId] || 0) + t.amount; });
  const pieData = Object.entries(expCats).map(([id, val]) => {
    const cat = cats.find(c => c.id === id) || { name: id, color: "#888", icon: "❓" };
    return { name: `${cat.icon} ${cat.name}`, value: val, color: cat.color };
  }).sort((a, b) => b.value - a.value);

  const todayStr = today();
  const [ty, tm, td] = todayStr.split("-").map(Number);
  const barData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(ty, tm - 1, td - (6 - i));
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return {
      label: d.toLocaleDateString("es", { weekday: "short" }),
      gastos:   txs.filter(t => t.date === ds && t.type === "expense").reduce((s, t) => s + t.amount, 0),
      ingresos: txs.filter(t => t.date === ds && t.type === "income").reduce((s, t) => s + t.amount, 0),
    };
  });

  return (
    <div style={S.page}>
      {/* DISPONIBLE REAL — número principal */}
      <div style={{ textAlign: "center", padding: "20px 0 8px" }}>
        <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.5)", textTransform: "uppercase", letterSpacing: "1px" }}>
          💵 Disponible real este mes
        </div>
        <div style={{ fontSize: "40px", fontWeight: 800, marginTop: "6px", color: disponible >= 0 ? "#52b788" : "#e07a5f" }}>
          {fmt(disponible)}
        </div>
        {totalReserved > 0 && (
          <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.4)", marginTop: "4px" }}>
            ya descontando {fmt(totalReserved)} de tus metas
          </div>
        )}
      </div>

      {/* Desglose: ingresos / gastos / metas */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px", marginTop: "12px" }}>
        <div style={S.statCard("#52b788")}>
          <div style={S.statLabel}>Ingresos</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#52b788", marginTop: "4px" }}>{fmt(totalIncome)}</div>
        </div>
        <div style={S.statCard("#e07a5f")}>
          <div style={S.statLabel}>Gastos</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#e07a5f", marginTop: "4px" }}>{fmt(totalExpense)}</div>
        </div>
        <div style={S.statCard("#f2cc8f")}>
          <div style={S.statLabel}>Metas</div>
          <div style={{ fontSize: "14px", fontWeight: 700, color: "#f2cc8f", marginTop: "4px" }}>{fmt(totalReserved)}</div>
        </div>
      </div>

      {/* Metas con barra visual */}
      {goals.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>🎯 Metas — dinero apartado</div>

          {/* Barra visual del ingreso dividido */}
          {totalIncome > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.45)", marginBottom: "6px" }}>
                Así se divide tu ingreso este mes
              </div>
              <div style={{ display: "flex", height: "14px", borderRadius: "7px", overflow: "hidden", gap: "2px" }}>
                {/* Gastos */}
                <div style={{ width: `${Math.min(totalExpense / totalIncome * 100, 100)}%`, background: "#e07a5f", minWidth: totalExpense > 0 ? "4px" : "0" }} title={`Gastos: ${fmt(totalExpense)}`} />
                {/* Cada meta */}
                {goalsData.filter(g => g.monthlyEquiv > 0).map(g => (
                  <div key={g.id} style={{ width: `${Math.min(g.monthlyEquiv / totalIncome * 100, 100)}%`, background: g.color, minWidth: g.monthlyEquiv > 0 ? "4px" : "0" }} title={`${g.name}: ${fmt(g.monthlyEquiv)}`} />
                ))}
                {/* Disponible */}
                {disponible > 0 && (
                  <div style={{ flex: 1, background: "#52b788" }} title={`Disponible: ${fmt(disponible)}`} />
                )}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#e07a5f" }} />
                  <span style={{ color: "rgba(240,236,227,0.6)" }}>Gastos {totalIncome > 0 ? Math.round(totalExpense/totalIncome*100) : 0}%</span>
                </div>
                {goalsData.filter(g => g.monthlyEquiv > 0).map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: g.color }} />
                    <span style={{ color: "rgba(240,236,227,0.6)" }}>{g.name} {g.percentage}%</span>
                  </div>
                ))}
                {disponible > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "11px" }}>
                    <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#52b788" }} />
                    <span style={{ color: "rgba(240,236,227,0.6)" }}>Libre {totalIncome > 0 ? Math.round(disponible/totalIncome*100) : 0}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {goalsData.map(g => {
            const weeklyAmt  = g.base * (g.percentage / 100);
            const displayAmt = g.period === "monthly" ? g.monthlyEquiv
              : g.period === "weekly" ? weeklyAmt
              : weeklyAmt / 7;
            const periodLabel = g.period === "monthly" ? "mes" : g.period === "weekly" ? "semana" : "día";
            return (
              <div key={g.id} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>{g.emoji} {g.name}</span>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "13px", color: g.color, fontWeight: 700 }}>{fmt(displayAmt)}</span>
                    <span style={{ fontSize: "11px", color: "rgba(240,236,227,0.4)", marginLeft: "4px" }}>/{periodLabel}</span>
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: "3px", height: "5px" }}>
                  <div style={{ height: "5px", borderRadius: "3px", background: `linear-gradient(90deg, ${g.color}, ${g.color}88)`,
                    width: `${g.base > 0 ? Math.min(g.percentage, 100) : 0}%` }} />
                </div>
                <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.35)", marginTop: "3px" }}>
                  {g.percentage}% de {g.source === "all" ? "todos los ingresos" : cats.find(c => c.id === g.source)?.name || ""}
                  {g.period !== "monthly" && <span style={{ color: "#f2cc8f88" }}> · no descuenta del balance mensual</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pieData.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>📊 Gastos por categoría</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f0ece3" }} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {pieData.map((d, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: d.color }} />
                <span style={{ color: "rgba(240,236,227,0.7)" }}>{d.name}</span>
                <span style={{ color: d.color, fontWeight: 700 }}>{totalExpense > 0 ? Math.round(d.value / totalExpense * 100) : 0}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={S.card}>
        <div style={S.sectionTitle}>📅 Últimos 7 días</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={barData} barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(240,236,227,0.4)" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f0ece3" }} />
            <Bar dataKey="ingresos" fill="#52b788" radius={[4,4,0,0]} />
            <Bar dataKey="gastos" fill="#e07a5f" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── TRANSACTIONS TAB ──────────────────────────────────────────────────────────
function Transactions({ txs, cats, onDelete }) {
  const [filter, setFilter] = useState("all");
  const filtered = txs.filter(t => filter === "all" || t.type === filter).sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div style={S.page}>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {[["all","Todos"],["expense","Gastos"],["income","Ingresos"]].map(([v,l]) => (
          <button key={v} style={S.pill(filter === v, "#f2cc8f")} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>
      {filtered.length === 0 && <div style={{ textAlign: "center", color: "rgba(240,236,227,0.3)", padding: "40px 0", fontSize: "14px" }}>Sin movimientos aún 👆 toca + para agregar</div>}
      {filtered.map(t => {
        const cat = cats.find(c => c.id === t.catId) || { name: "?", icon: "❓", color: "#888" };
        return (
          <div key={t.id} style={S.txItem}>
            <div style={{ fontSize: "24px" }}>{cat.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>{cat.name}</span>
                <span style={S.badge(cat.color)}>{t.type === "income" ? "ingreso" : "gasto"}</span>
              </div>
              {t.reason && <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.reason}</div>}
              <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.3)", marginTop: "2px" }}>{t.date}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700, color: t.type === "income" ? "#52b788" : "#e07a5f", fontSize: "14px" }}>
                {t.type === "income" ? "+" : "-"}{fmt(t.amount)}
              </div>
              <button onClick={() => onDelete(t.id)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", marginTop: "2px" }}>🗑️</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── WEEKLY STATS ──────────────────────────────────────────────────────────────
// getWeekRange, inRange, weekLabel ya definidos arriba con zona horaria Colombia
const CUSTOM_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

function WeekStats({ txs, cats }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const { monday, sunday } = getWeekRange(weekOffset);
  const weekTxs = txs.filter(t => inRange(t.date, mondayStr, sundayStr));
  const totalIncome = weekTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = weekTxs.filter(t => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const buildPie = (type, total) => {
    const map = {};
    weekTxs.filter(t => t.type === type).forEach(t => { map[t.catId] = (map[t.catId] || 0) + t.amount; });
    return Object.entries(map).map(([id, val]) => {
      const cat = cats.find(c => c.id === id) || { name: id, icon: "❓", color: "#888" };
      return { name: `${cat.icon} ${cat.name}`, value: val, color: cat.color, pct: total > 0 ? (val / total * 100).toFixed(1) : 0 };
    }).sort((a, b) => b.value - a.value);
  };
  const expPie = buildPie("expense", totalExpense);
  const incPie = buildPie("income", totalIncome);

  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return {
      label: d.toLocaleDateString("es", { weekday: "short" }),
      gastos: weekTxs.filter(t => t.date === ds && t.type === "expense").reduce((s, t) => s + t.amount, 0),
      ingresos: weekTxs.filter(t => t.date === ds && t.type === "income").reduce((s, t) => s + t.amount, 0),
    };
  });

  const PieLegend = ({ data }) => (
    <div style={{ flex: 1 }}>
      {data.map((d, i) => (
        <div key={i} style={{ marginBottom: "9px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
            <span style={{ fontSize: "12px", fontWeight: 600 }}>{d.name}</span>
            <span style={{ fontSize: "12px", color: d.color, fontWeight: 700 }}>{d.pct}%</span>
          </div>
          <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
            <div style={{ height: "4px", width: `${d.pct}%`, background: d.color, borderRadius: "2px", transition: "width 0.6s" }} />
          </div>
          <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.4)", marginTop: "1px" }}>{fmt(d.value)}</div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={S.page}>
      {/* Navigator */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px", background: "rgba(255,255,255,0.05)", borderRadius: "14px", padding: "12px 16px" }}>
        <button onClick={() => setWeekOffset(o => o - 1)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "#f0ece3", borderRadius: "8px", width: "34px", height: "34px", cursor: "pointer", fontSize: "18px" }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: "#f2cc8f" }}>{weekOffset === 0 ? "✨ Esta semana" : `Hace ${Math.abs(weekOffset)} semana${Math.abs(weekOffset)>1?"s":""}`}</div>
          <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.45)", marginTop: "2px" }}>{weekLabel(monday, sunday)}</div>
        </div>
        <button onClick={() => setWeekOffset(o => Math.min(o + 1, 0))} disabled={weekOffset === 0}
          style={{ background: weekOffset === 0 ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.08)", border: "none", color: weekOffset === 0 ? "rgba(240,236,227,0.2)" : "#f0ece3", borderRadius: "8px", width: "34px", height: "34px", cursor: weekOffset === 0 ? "default" : "pointer", fontSize: "18px" }}>›</button>
      </div>

      <div style={S.statGrid}>
        <div style={S.statCard("#52b788")}><div style={S.statLabel}>Ingresos</div><div style={{ ...S.statVal, color: "#52b788", fontSize: "16px" }}>{fmt(totalIncome)}</div></div>
        <div style={S.statCard("#e07a5f")}><div style={S.statLabel}>Gastos</div><div style={{ ...S.statVal, color: "#e07a5f", fontSize: "16px" }}>{fmt(totalExpense)}</div></div>
      </div>
      <div style={{ ...S.statCard(balance >= 0 ? "#52b788" : "#e07a5f"), marginBottom: "14px", textAlign: "center" }}>
        <div style={S.statLabel}>Balance semana</div>
        <div style={{ fontSize: "28px", fontWeight: 800, color: balance >= 0 ? "#52b788" : "#e07a5f", marginTop: "4px" }}>{fmt(balance)}</div>
      </div>

      <div style={S.card}>
        <div style={S.sectionTitle}>📅 Gastos e ingresos por día</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={dailyData} barSize={10} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: "rgba(240,236,227,0.5)" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f0ece3", fontSize: "12px" }} />
            <Bar dataKey="ingresos" fill="#52b788" radius={[4,4,0,0]} name="Ingresos" />
            <Bar dataKey="gastos" fill="#e07a5f" radius={[4,4,0,0]} name="Gastos" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {expPie.length > 0 ? (
        <div style={S.card}>
          <div style={S.sectionTitle}>🔴 ¿En qué gasté esta semana?</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flexShrink: 0 }}>
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={expPie} cx="50%" cy="50%" outerRadius={68} dataKey="value" labelLine={false} label={CUSTOM_LABEL}>
                    {expPie.map((e, i) => <Cell key={i} fill={e.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f0ece3", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend data={expPie} />
          </div>
        </div>
      ) : (
        <div style={{ ...S.card, textAlign: "center", color: "rgba(240,236,227,0.3)", fontSize: "14px" }}>Sin gastos esta semana 🎉</div>
      )}

      {incPie.length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>🟢 ¿De dónde vinieron los ingresos?</div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flexShrink: 0 }}>
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie data={incPie} cx="50%" cy="50%" outerRadius={68} dataKey="value" labelLine={false} label={CUSTOM_LABEL}>
                    {incPie.map((e, i) => <Cell key={i} fill={e.color} stroke="rgba(0,0,0,0.3)" strokeWidth={1} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [fmt(v), n]} contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "#f0ece3", fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <PieLegend data={incPie} />
          </div>
        </div>
      )}

      {weekTxs.filter(t => t.type === "expense").length > 0 && (
        <div style={S.card}>
          <div style={S.sectionTitle}>🏆 Top gastos de la semana</div>
          {weekTxs.filter(t => t.type === "expense").sort((a, b) => b.amount - a.amount).slice(0, 5).map(t => {
            const cat = cats.find(c => c.id === t.catId) || { name: "?", icon: "❓", color: "#888" };
            const pct = totalExpense > 0 ? (t.amount / totalExpense * 100).toFixed(1) : 0;
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                <span style={{ fontSize: "18px" }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "60%" }}>{t.reason || cat.name}</span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#e07a5f", flexShrink: 0 }}>{pct}%</span>
                  </div>
                  <div style={{ height: "4px", background: "rgba(255,255,255,0.07)", borderRadius: "2px" }}>
                    <div style={{ height: "4px", width: `${pct}%`, background: cat.color, borderRadius: "2px" }} />
                  </div>
                  <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.4)", marginTop: "1px" }}>{fmt(t.amount)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── GOALS TAB ─────────────────────────────────────────────────────────────────
function Goals({ goals, cats, txs, onSave, onDelete }) {
  const [form, setForm] = useState(null);
  const now = new Date();
  const monthTxs = txs.filter(t => t.date.startsWith(monthPrefix()));
  const totalIncome = monthTxs.filter(t => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const incCats = cats.filter(c => c.type === "income");
  const F = form || { name: "", emoji: "🎯", percentage: 10, period: "monthly", source: "all", color: "#f2cc8f" };
  const saveGoal = () => {
    if (!F.name) return alert("Ponle nombre a la meta");
    onSave({ ...F, id: F.id || uid() });
    setForm(null);
  };
  return (
    <div style={S.page}>
      <button style={S.btn("#f2cc8f")} onClick={() => setForm({})}>+ Nueva meta de ahorro</button>
      {form !== null && (
        <div style={{ ...S.card, marginTop: "14px" }}>
          <div style={S.sectionTitle}>{F.id ? "Editar" : "Nueva"} meta</div>
          <div style={S.formGrid}>
            <div><label style={S.label}>Nombre</label><input style={S.input} value={F.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ej: Flores 💐" /></div>
            <div><label style={S.label}>Emoji</label><input style={S.input} value={F.emoji} onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))} /></div>
          </div>
          <div style={{ marginTop: "10px" }}>
            <label style={S.label}>% de ingresos: <strong style={{ color: "#f2cc8f" }}>{F.percentage}%</strong></label>
            <input type="range" min="1" max="50" value={F.percentage} onChange={e => setForm(p => ({ ...p, percentage: +e.target.value }))} style={{ width: "100%", accentColor: "#f2cc8f" }} />
          </div>
          <div style={S.formGrid}>
            <div>
              <label style={S.label}>Frecuencia</label>
              <select style={S.select} value={F.period} onChange={e => setForm(p => ({ ...p, period: e.target.value }))}>
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </div>
            <div>
              <label style={S.label}>De ingresos de...</label>
              <select style={S.select} value={F.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>
                <option value="all">Todos los ingresos</option>
                {incCats.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
          </div>
          <div style={S.formGrid}>
            <button style={{ ...S.btn("#f2cc8f"), marginTop: "10px" }} onClick={saveGoal}>Guardar</button>
            <button style={{ ...S.btn("rgba(255,255,255,0.08)", "#f0ece3"), marginTop: "10px" }} onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: "14px" }}>
        {goals.map(g => {
          const base = g.source === "all" ? totalIncome : monthTxs.filter(t => t.type === "income" && t.catId === g.source).reduce((s, t) => s + t.amount, 0);
          const target = base * (g.percentage / 100);
          const sourceLabel = g.source === "all" ? "todos los ingresos" : cats.find(c => c.id === g.source)?.name || g.source;
          return (
            <div key={g.id} style={{ ...S.card, border: `1px solid ${g.color}44` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "24px" }}>{g.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: "16px", marginTop: "4px" }}>{g.name}</div>
                  <div style={{ fontSize: "12px", color: "rgba(240,236,227,0.45)", marginTop: "2px" }}>
                    {g.percentage}% {g.period === "daily" ? "diario" : g.period === "weekly" ? "semanal" : "mensual"} de {sourceLabel}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: g.color }}>{fmt(target)}</div>
                  <div style={{ fontSize: "11px", color: "rgba(240,236,227,0.4)" }}>este mes</div>
                  <div style={{ display: "flex", gap: "6px", marginTop: "6px", justifyContent: "flex-end" }}>
                    <button style={S.btnSm("#f2cc8f22", "#f2cc8f")} onClick={() => setForm(g)}>✏️</button>
                    <button style={S.btnSm("#e07a5f22", "#e07a5f")} onClick={() => onDelete(g.id)}>🗑️</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && <div style={{ textAlign: "center", color: "rgba(240,236,227,0.3)", padding: "30px 0", fontSize: "14px" }}>No tienes metas aún 🎯</div>}
      </div>
    </div>
  );
}

// ── CATEGORIES TAB ────────────────────────────────────────────────────────────
function Categories({ cats, onSave, onDelete }) {
  const [form, setForm] = useState(null);
  const COLORS = ["#e07a5f","#3d405b","#81b29a","#f2cc8f","#a8dadc","#c77dff","#52b788","#74c69d","#f77f9e","#ffd166"];
  const F = form || { name: "", icon: "📌", color: COLORS[0], type: "expense" };
  const saveCat = () => {
    if (!F.name) return alert("Ponle nombre");
    onSave({ ...F, id: F.id || uid() });
    setForm(null);
  };
  const CatList = ({ list }) => list.map(c => (
    <div key={c.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", background: "rgba(255,255,255,0.04)", marginBottom: "6px" }}>
      <span style={{ fontSize: "20px" }}>{c.icon}</span>
      <span style={{ flex: 1, fontWeight: 500, fontSize: "14px" }}>{c.name}</span>
      <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: c.color }} />
      <button style={S.btnSm("#f2cc8f22", "#f2cc8f")} onClick={() => setForm(c)}>✏️</button>
      <button style={S.btnSm("#e07a5f22", "#e07a5f")} onClick={() => onDelete(c.id)}>🗑️</button>
    </div>
  ));
  return (
    <div style={S.page}>
      <button style={S.btn("#f2cc8f")} onClick={() => setForm({})}>+ Nueva categoría</button>
      {form !== null && (
        <div style={{ ...S.card, marginTop: "14px" }}>
          <div style={S.sectionTitle}>{F.id ? "Editar" : "Nueva"} categoría</div>
          <div style={S.formGrid}>
            <div><label style={S.label}>Nombre</label><input style={S.input} value={F.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="ej: Flores" /></div>
            <div><label style={S.label}>Emoji</label><input style={S.input} value={F.icon} onChange={e => setForm(p => ({ ...p, icon: e.target.value }))} /></div>
          </div>
          <div style={{ marginTop: "10px" }}>
            <label style={S.label}>Tipo</label>
            <div style={{ display: "flex", gap: "8px" }}>
              {[["expense","Gasto"],["income","Ingreso"]].map(([v,l]) => (
                <button key={v} style={S.pill(F.type === v, v === "expense" ? "#e07a5f" : "#52b788")} onClick={() => setForm(p => ({ ...p, type: v }))}>{l}</button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "10px" }}>
            <label style={S.label}>Color</label>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {COLORS.map(c => (
                <div key={c} onClick={() => setForm(p => ({ ...p, color: c }))} style={{ width: "26px", height: "26px", borderRadius: "50%", background: c, cursor: "pointer", border: F.color === c ? "3px solid white" : "3px solid transparent" }} />
              ))}
            </div>
          </div>
          <div style={S.formGrid}>
            <button style={{ ...S.btn("#f2cc8f"), marginTop: "10px" }} onClick={saveCat}>Guardar</button>
            <button style={{ ...S.btn("rgba(255,255,255,0.08)", "#f0ece3"), marginTop: "10px" }} onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <div style={{ marginTop: "14px" }}>
        <div style={S.sectionTitle}>💸 Gastos</div>
        <CatList list={cats.filter(c => c.type === "expense")} />
        <div style={{ ...S.sectionTitle, marginTop: "16px" }}>💵 Ingresos</div>
        <CatList list={cats.filter(c => c.type === "income")} />
      </div>
    </div>
  );
}

// ── APP ROOT ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [txs, setTxs] = useState(() => load("txs") || []);
  const [cats, setCats] = useState(() => load("cats") || DEFAULT_CATS);
  const [goals, setGoals] = useState(() => load("goals") || DEFAULT_GOALS);
  const [showAdd, setShowAdd] = useState(false);

  const saveTxs = useCallback((next) => { setTxs(next); save("txs", next); }, []);
  const saveCats = useCallback((next) => { setCats(next); save("cats", next); }, []);
  const saveGoals = useCallback((next) => { setGoals(next); save("goals", next); }, []);

  const addTx = (tx) => saveTxs([tx, ...txs]);
  const delTx = (id) => saveTxs(txs.filter(t => t.id !== id));
  const upsertCat = (cat) => saveCats(cats.some(c => c.id === cat.id) ? cats.map(c => c.id === cat.id ? cat : c) : [...cats, cat]);
  const delCat = (id) => saveCats(cats.filter(c => c.id !== id));
  const upsertGoal = (g) => saveGoals(goals.some(x => x.id === g.id) ? goals.map(x => x.id === g.id ? g : x) : [...goals, g]);
  const delGoal = (id) => saveGoals(goals.filter(g => g.id !== id));

  const TABS = [
    { id: "dashboard", label: "📊 Inicio" },
    { id: "transactions", label: "💳 Movimientos" },
    { id: "stats", label: "📈 Semana" },
    { id: "goals", label: "🎯 Metas" },
    { id: "categories", label: "🏷️ Categorías" },
  ];

  return (
    <div style={S.app}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={S.header}>
        <div style={S.headerTitle}>💸 MisFinanzas</div>
        <div style={S.headerSub}>Tu dinero, ordenado y claro</div>
      </div>
      <div style={S.tabsWrapper}>
        <div style={S.tabs}>
          {TABS.map(t => <button key={t.id} style={S.tab(tab === t.id)} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>
      </div>
      {tab === "dashboard" && <Dashboard txs={txs} cats={cats} goals={goals} />}
      {tab === "transactions" && <Transactions txs={txs} cats={cats} onDelete={delTx} />}
      {tab === "stats" && <WeekStats txs={txs} cats={cats} />}
      {tab === "goals" && <Goals goals={goals} cats={cats} txs={txs} onSave={upsertGoal} onDelete={delGoal} />}
      {tab === "categories" && <Categories cats={cats} onSave={upsertCat} onDelete={delCat} />}
      <Fab onClick={() => setShowAdd(true)} />
      {showAdd && <AddTxModal cats={cats} onSave={addTx} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
