import { useState, useEffect } from "react";

const JOBS_KEY = "ser-jobs-v3";
const CUSTOMERS_KEY = "ser-customers-v3";
const RATES_KEY = "ser-rates-v3";

const DEFAULT_SERVICES = [
  { id: "diag",         label: "Diagnostic",                       hours: 0.5,  margin: 1.6  },
  { id: "carb_clean",   label: "Carb Clean",                       hours: 1.0,  margin: 1.65 },
  { id: "tune_up",      label: "Tune-Up (plug, filter, oil, carb)",hours: 1.5,  margin: 1.65 },
  { id: "belt_tractor", label: "Belt Replacement – Tractor",       hours: 1.5,  margin: 1.7  },
  { id: "belt_blower",  label: "Belt Replacement – Blower",        hours: 1.0,  margin: 1.7  },
  { id: "blade",        label: "Blade Sharpen / Replace",          hours: 0.5,  margin: 1.6  },
  { id: "recoil",       label: "Pull Cord / Recoil Repair",        hours: 0.75, margin: 1.6  },
  { id: "fuel_line",    label: "Fuel Line & Filter",               hours: 0.75, margin: 1.65 },
  { id: "oil_change",   label: "Oil Change",                       hours: 0.5,  margin: 1.6  },
  { id: "starter",      label: "Starter Motor Repair",             hours: 1.5,  margin: 1.7  },
  { id: "battery",      label: "Battery / Charging Diagnosis",     hours: 0.75, margin: 1.65 },
  { id: "deck_wash",    label: "Deck Wash & Inspection",           hours: 0.5,  margin: 1.6  },
  { id: "winter_prep",  label: "Winter Storage Prep",              hours: 0.75, margin: 1.6  },
  { id: "spring_start", label: "Spring Startup Service",           hours: 0.75, margin: 1.6  },
];

const HOURLY = 65;
const svcPrice = (s) => Math.ceil((s.hours * HOURLY * s.margin) / 5) * 5;
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toLocaleDateString("en-CA");

const STATUSES = [
  { key: "new",      label: "New",          color: "#60a5fa", bg: "#172554" },
  { key: "diag",     label: "Diagnosing",   color: "#fbbf24", bg: "#1c1400" },
  { key: "approved", label: "Approved",     color: "#c084fc", bg: "#1e1030" },
  { key: "wip",      label: "In Progress",  color: "#34d399", bg: "#022c22" },
  { key: "ready",    label: "Ready Pickup", color: "#fb923c", bg: "#1c0e00" },
  { key: "paid",     label: "Paid ✓",       color: "#6b7280", bg: "#111827" },
];
const getSt = (k) => STATUSES.find(s => s.key === k) || STATUSES[0];
const nextSt = (k) => {
  const i = STATUSES.findIndex(s => s.key === k);
  return STATUSES[Math.min(i + 1, STATUSES.length - 1)].key;
};

// localStorage persistence
function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function saveData(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { console.error(e); }
}

const T = {
  bg: "#09090b", surface: "#18181b", border: "#27272a",
  text: "#fafafa", muted: "#71717a", dim: "#3f3f46",
  accent: "#3b82f6", green: "#22c55e",
  mono: "'JetBrains Mono', 'Fira Mono', monospace",
};

function Pill({ statusKey }) {
  const s = getSt(statusKey);
  return (
    <span style={{
      background: s.bg, color: s.color, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.06em", padding: "4px 10px", borderRadius: 99,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>{s.label}</span>
  );
}

function TInput({ value, onChange, placeholder, type = "text", style = {} }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} type={type}
      style={{
        background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10,
        padding: "14px", color: T.text, fontSize: 16, outline: "none",
        width: "100%", boxSizing: "border-box", WebkitAppearance: "none", ...style,
      }} />
  );
}

function Label({ children }) {
  return (
    <div style={{ color: T.muted, fontSize: 11, fontWeight: 700,
      letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
      {children}
    </div>
  );
}

function Surface({ children, style = {} }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`,
      borderRadius: 14, padding: 16, ...style }}>
      {children}
    </div>
  );
}

function PrimaryBtn({ children, onClick, disabled, color = T.accent }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{
        background: disabled ? T.dim : color, color: disabled ? T.muted : "#fff",
        border: "none", borderRadius: 12, padding: 16, fontSize: 16,
        fontWeight: 700, cursor: disabled ? "default" : "pointer",
        width: "100%", minHeight: 52,
      }}>{children}</button>
  );
}

function GhostBtn({ children, onClick }) {
  return (
    <button onClick={onClick}
      style={{
        background: "none", color: T.muted, border: `1.5px solid ${T.border}`,
        borderRadius: 12, padding: "14px 16px", fontSize: 15,
        fontWeight: 600, cursor: "pointer", minHeight: 48,
      }}>{children}</button>
  );
}

function Dashboard({ jobs, customers, onSelect, onNew }) {
  const [filter, setFilter] = useState("active");
  const activeKeys = ["new","diag","approved","wip","ready"];
  const visible = filter === "active" ? jobs.filter(j => activeKeys.includes(j.status))
    : filter === "paid" ? jobs.filter(j => j.status === "paid") : jobs;
  const revenue = jobs.filter(j => j.status === "paid").reduce((s,j) => s + (j.total||0), 0);
  const open = jobs.filter(j => activeKeys.includes(j.status)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        {[{label:"Open",val:open,color:"#60a5fa"},{label:"Revenue",val:fmt(revenue),color:T.green}].map(s => (
          <Surface key={s.label} style={{ flex: 1, padding: "14px 16px" }}>
            <div style={{ color: T.muted, fontSize: 11, fontWeight: 700,
              letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{s.label}</div>
            <div style={{ color: s.color, fontSize: 26, fontWeight: 800, fontFamily: T.mono }}>{s.val}</div>
          </Surface>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {[["active","Active"],["paid","Paid"],["all","All"]].map(([k,l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{
              background: filter===k ? T.accent : T.surface,
              color: filter===k ? "#fff" : T.muted,
              border: `1px solid ${filter===k ? T.accent : T.border}`,
              borderRadius: 99, padding: "8px 18px", fontSize: 13,
              fontWeight: 600, cursor: "pointer", minHeight: 36,
            }}>{l}</button>
        ))}
      </div>
      {visible.length === 0
        ? <div style={{ color: T.dim, textAlign: "center", padding: "60px 0", fontSize: 15 }}>
            No jobs — tap + to add one
          </div>
        : visible.map(job => {
          const cust = customers.find(c => c.id === job.customerId);
          return (
            <button key={job.id} onClick={() => onSelect(job.id)}
              style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 14, padding: 16, cursor: "pointer",
                textAlign: "left", width: "100%", minHeight: 80,
              }}>
              <div style={{ display: "flex", justifyContent: "space-between",
                alignItems: "flex-start", marginBottom: 10 }}>
                <div style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>
                  {cust?.name || "Unknown"}
                </div>
                <Pill statusKey={job.status} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ color: T.muted, fontSize: 13 }}>
                  {[job.equipType, job.equipMake].filter(Boolean).join(" · ") || "No equipment"}
                </div>
                {job.total > 0 && (
                  <div style={{ color: "#93c5fd", fontFamily: T.mono, fontWeight: 700, fontSize: 15 }}>
                    {fmt(job.total)}
                  </div>
                )}
              </div>
            </button>
          );
        })
      }
      <button onClick={onNew}
        style={{
          position: "fixed", bottom: 90, right: 20, width: 60, height: 60,
          borderRadius: 99, background: T.accent, color: "#fff", border: "none",
          fontSize: 32, cursor: "pointer", boxShadow: "0 4px 24px rgba(59,130,246,0.5)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>+</button>
    </div>
  );
}

function NewJob({ customers, onSave, onCancel }) {
  const [mode, setMode] = useState("new");
  const [existingId, setExistingId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [equipType, setEquipType] = useState("");
  const [equipMake, setEquipMake] = useState("");
  const [notes, setNotes] = useState("");
  const valid = mode === "existing" ? !!existingId : !!name;

  const submit = () => {
    let cid = existingId, newCust = null;
    if (mode === "new") {
      cid = genId();
      newCust = { id: cid, name, phone, createdAt: today() };
    }
    onSave({
      id: genId(), customerId: cid, equipType, equipMake, notes,
      status: "new", createdAt: today(),
      services: [], parts: [], labourTotal: 0, partsTotal: 0, total: 0,
      timeInvested: 0, history: [{ date: today(), note: "Job created" }],
    }, newCust);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>New Job</div>
      <Surface>
        <Label>Customer</Label>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {[["new","New"],["existing","Returning"]].map(([k,l]) => (
            <button key={k} onClick={() => setMode(k)}
              style={{
                flex: 1, background: mode===k ? T.accent : T.bg,
                color: mode===k ? "#fff" : T.muted,
                border: `1.5px solid ${mode===k ? T.accent : T.border}`,
                borderRadius: 10, padding: 12, fontSize: 15,
                fontWeight: 600, cursor: "pointer", minHeight: 48,
              }}>{l}</button>
          ))}
        </div>
        {mode === "new" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div><Label>Name</Label><TInput value={name} onChange={setName} placeholder="John Smith" /></div>
            <div><Label>Phone</Label><TInput value={phone} onChange={setPhone} placeholder="905-555-0100" type="tel" /></div>
          </div>
        ) : (
          <div>
            <Label>Select customer</Label>
            <select value={existingId} onChange={e => setExistingId(e.target.value)}
              style={{
                background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10,
                padding: 14, color: existingId ? T.text : T.muted,
                fontSize: 16, outline: "none", width: "100%", minHeight: 52,
              }}>
              <option value="">— choose —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ` · ${c.phone}` : ""}</option>)}
            </select>
          </div>
        )}
      </Surface>
      <Surface>
        <Label>Equipment</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><Label>Type</Label><TInput value={equipType} onChange={setEquipType} placeholder="Lawnmower, Snowblower…" /></div>
          <div><Label>Make & Model</Label><TInput value={equipMake} onChange={setEquipMake} placeholder="Honda HRX217" /></div>
        </div>
      </Surface>
      <Surface>
        <Label>Notes from customer</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="What they described…"
          style={{
            background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10,
            padding: 14, color: T.text, fontSize: 16, outline: "none",
            resize: "vertical", width: "100%", boxSizing: "border-box", lineHeight: 1.5,
          }} />
      </Surface>
      <div style={{ display: "flex", gap: 10 }}>
        <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        <div style={{ flex: 1 }}><PrimaryBtn onClick={submit} disabled={!valid}>Create Job</PrimaryBtn></div>
      </div>
    </div>
  );
}

function JobDetail({ job, customer, allServices, onUpdate, onBack }) {
  const [tab, setTab] = useState("overview");
  const [partName, setPartName] = useState("");
  const [partCost, setPartCost] = useState("");
  const [noteText, setNoteText] = useState("");
  const [timeInput, setTimeInput] = useState(job.timeInvested?.toString() || "0");
  const [editTime, setEditTime] = useState(false);

  const recalc = (svcs, parts) => {
    const labour = svcs.reduce((s,x) => s + x.price, 0);
    const pt = parts.reduce((s,x) => s + x.cost, 0);
    return { labourTotal: labour, partsTotal: pt, total: labour + pt };
  };

  const toggleSvc = (svc) => {
    const has = job.services.find(s => s.id === svc.id);
    const updated = has ? job.services.filter(s => s.id !== svc.id)
      : [...job.services, { ...svc, price: svcPrice(svc) }];
    onUpdate({ ...job, services: updated, ...recalc(updated, job.parts) });
  };

  const addPart = () => {
    if (!partName || !partCost) return;
    const updated = [...job.parts, { id: genId(), name: partName, cost: parseFloat(partCost)||0 }];
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
    setPartName(""); setPartCost("");
  };

  const removePart = (id) => {
    const updated = job.parts.filter(p => p.id !== id);
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
  };

  const editPartCost = (id, val) => {
    const updated = job.parts.map(p => p.id === id ? { ...p, cost: parseFloat(val)||0 } : p);
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const history = [...(job.history||[]), { date: today(), note: noteText.trim() }];
    onUpdate({ ...job, history });
    setNoteText("");
  };

  const advance = () => {
    const ns = nextSt(job.status);
    const history = [...(job.history||[]), { date: today(), note: `→ ${getSt(ns).label}` }];
    onUpdate({ ...job, status: ns, history });
  };

  const st = getSt(job.status);
  const isPaid = job.status === "paid";
  const TABS = [
    { key: "overview", icon: "◎", label: "Overview" },
    { key: "work",     icon: "🔧", label: `Work${job.services.length ? ` (${job.services.length})` : ""}` },
    { key: "parts",    icon: "📦", label: `Parts${job.parts.length ? ` (${job.parts.length})` : ""}` },
    { key: "log",      icon: "📋", label: "Log" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ marginBottom: 16 }}>
        <button onClick={onBack}
          style={{ background: "none", border: "none", color: T.muted,
            fontSize: 15, cursor: "pointer", padding: "0 0 12px 0",
            display: "flex", alignItems: "center", gap: 4, minHeight: 44 }}>
          ← Back
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>{customer?.name || "—"}</div>
            <div style={{ color: T.muted, fontSize: 14, marginTop: 4 }}>
              {[job.equipType, job.equipMake].filter(Boolean).join(" · ") || "No equipment"}
            </div>
            {customer?.phone && (
              <a href={`tel:${customer.phone}`}
                style={{ color: "#60a5fa", fontSize: 15, textDecoration: "none",
                  marginTop: 6, display: "flex", alignItems: "center", gap: 4, minHeight: 36 }}>
                📞 {customer.phone}
              </a>
            )}
          </div>
          <Pill statusKey={job.status} />
        </div>
      </div>
      {!isPaid && (
        <button onClick={advance}
          style={{
            background: st.bg, border: `1.5px solid ${st.color}55`,
            color: st.color, borderRadius: 12, padding: "14px 16px",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
            marginBottom: 16, width: "100%", minHeight: 52,
          }}>
          Mark as {getSt(nextSt(job.status)).label} →
        </button>
      )}
      <div style={{ display: "flex", borderBottom: `1.5px solid ${T.border}`, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: `2.5px solid ${tab===t.key ? T.accent : "transparent"}`,
              color: tab===t.key ? "#60a5fa" : T.dim,
              padding: "10px 2px 12px", fontSize: 11, fontWeight: 700,
              cursor: "pointer", minHeight: 48, lineHeight: 1.3,
            }}>
            <div style={{ fontSize: 16, marginBottom: 2 }}>{t.icon}</div>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Surface>
            <Label>Total</Label>
            {[["Labour", job.labourTotal],["Parts", job.partsTotal]].map(([l,v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: `1px solid ${T.border}`,
                color: T.muted, fontSize: 15 }}>
                <span>{l}</span><span style={{ fontFamily: T.mono }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, alignItems: "center" }}>
              <span style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>Total</span>
              <span style={{ color: "#93c5fd", fontFamily: T.mono, fontWeight: 800, fontSize: 24 }}>{fmt(job.total)}</span>
            </div>
          </Surface>
          <Surface>
            <Label>Time Invested</Label>
            {editTime ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="number" step="0.25" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                  style={{ width: 90, background: T.bg, border: `1.5px solid ${T.border}`,
                    borderRadius: 10, padding: 12, color: T.text, fontSize: 16, outline: "none" }} />
                <span style={{ color: T.muted, fontSize: 15 }}>hrs</span>
                <button onClick={() => { onUpdate({...job, timeInvested: parseFloat(timeInput)||0}); setEditTime(false); }}
                  style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 10,
                    padding: "12px 18px", fontWeight: 700, cursor: "pointer", fontSize: 15, minHeight: 48 }}>
                  Save
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: T.text, fontFamily: T.mono, fontSize: 22, fontWeight: 800 }}>
                  {job.timeInvested || 0} hrs
                </span>
                <GhostBtn onClick={() => setEditTime(true)}>Edit</GhostBtn>
              </div>
            )}
          </Surface>
          {job.notes && (
            <Surface>
              <Label>Customer Notes</Label>
              <div style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.6 }}>{job.notes}</div>
            </Surface>
          )}
          <div style={{ color: T.dim, fontSize: 12, textAlign: "center", padding: "8px 0" }}>
            Created {job.createdAt}
          </div>
        </div>
      )}

      {tab === "work" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ color: T.muted, fontSize: 13, marginBottom: 4 }}>Tap to toggle. Changes save instantly.</div>
          {allServices.map(svc => {
            const on = !!job.services.find(s => s.id === svc.id);
            return (
              <button key={svc.id} onClick={() => toggleSvc(svc)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", borderRadius: 12, cursor: "pointer",
                  background: on ? "#052e16" : T.surface,
                  border: `1.5px solid ${on ? "#16a34a" : T.border}`,
                  minHeight: 56, width: "100%", textAlign: "left",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6,
                    border: `2px solid ${on ? T.green : T.dim}`,
                    background: on ? T.green : "transparent", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {on && <span style={{ color: "#000", fontSize: 13, fontWeight: 900 }}>✓</span>}
                  </div>
                  <span style={{ color: on ? T.text : "#a1a1aa", fontSize: 15 }}>{svc.label}</span>
                </div>
                <span style={{ color: on ? T.green : T.dim, fontFamily: T.mono, fontWeight: 700, fontSize: 15 }}>
                  {fmt(svcPrice(svc))}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {tab === "parts" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Surface>
            <Label>Add Part</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <TInput value={partName} onChange={setPartName} placeholder="Part name" />
              <div style={{ display: "flex", gap: 10 }}>
                <TInput value={partCost} onChange={setPartCost} placeholder="Cost $" type="number" style={{ flex: 1 }} />
                <button onClick={addPart}
                  style={{
                    background: T.accent, color: "#fff", border: "none",
                    borderRadius: 10, padding: "0 20px", fontWeight: 700,
                    cursor: "pointer", fontSize: 24, minHeight: 52, minWidth: 52,
                  }}>+</button>
              </div>
            </div>
          </Surface>
          {job.parts.length === 0
            ? <div style={{ color: T.dim, textAlign: "center", padding: "32px 0", fontSize: 15 }}>No parts added yet</div>
            : job.parts.map(p => (
              <div key={p.id} style={{
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "14px 16px",
                display: "flex", alignItems: "center", gap: 10, minHeight: 56,
              }}>
                <span style={{ color: T.text, fontSize: 15, flex: 1 }}>{p.name}</span>
                <input type="number" value={p.cost} onChange={e => editPartCost(p.id, e.target.value)}
                  style={{
                    width: 80, background: T.bg, border: `1.5px solid ${T.border}`,
                    borderRadius: 8, padding: "10px 8px", color: "#93c5fd",
                    fontFamily: T.mono, fontSize: 15, outline: "none", textAlign: "right",
                  }} />
                <button onClick={() => removePart(p.id)}
                  style={{ background: "none", border: "none", color: "#ef4444",
                    cursor: "pointer", fontSize: 22, padding: "0 4px", minWidth: 36, minHeight: 44 }}>×</button>
              </div>
            ))
          }
        </div>
      )}

      {tab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Surface>
            <Label>Add Note</Label>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="What did you find or do?"
                onKeyDown={e => e.key === "Enter" && addNote()}
                style={{
                  flex: 1, background: T.bg, border: `1.5px solid ${T.border}`,
                  borderRadius: 10, padding: 14, color: T.text,
                  fontSize: 16, outline: "none", minHeight: 52,
                }} />
              <button onClick={addNote}
                style={{
                  background: T.accent, color: "#fff", border: "none",
                  borderRadius: 10, padding: "0 18px", fontWeight: 700,
                  cursor: "pointer", fontSize: 22, minHeight: 52, minWidth: 52,
                }}>+</button>
            </div>
          </Surface>
          {[...(job.history||[])].reverse().map((h,i) => (
            <div key={i} style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: "14px 16px",
            }}>
              <div style={{ color: T.dim, fontSize: 12, marginBottom: 4 }}>{h.date}</div>
              <div style={{ color: "#d4d4d8", fontSize: 15, lineHeight: 1.5 }}>{h.note}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Rates({ services, onSave }) {
  const [local, setLocal] = useState(services.map(s => ({...s})));
  const [saved, setSaved] = useState(false);
  const upd = (id, field, val) =>
    setLocal(l => l.map(s => s.id===id ? {...s, [field]: parseFloat(val)||0} : s));
  const save = () => { onSave(local); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>Service Rates</div>
      <div style={{ color: T.muted, fontSize: 14 }}>Price = hours × ${HOURLY}/hr × margin, rounded to nearest $5.</div>
      {local.map(s => (
        <Surface key={s.id}>
          <div style={{ color: T.text, fontSize: 15, fontWeight: 600, marginBottom: 12 }}>{s.label}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Label>Hours</Label>
              <input type="number" step="0.25" value={s.hours} onChange={e => upd(s.id,"hours",e.target.value)}
                style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
                  borderRadius: 10, padding: 12, color: T.text, fontSize: 16,
                  outline: "none", boxSizing: "border-box", minHeight: 48 }} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Margin ×</Label>
              <input type="number" step="0.05" value={s.margin} onChange={e => upd(s.id,"margin",e.target.value)}
                style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
                  borderRadius: 10, padding: 12, color: T.text, fontSize: 16,
                  outline: "none", boxSizing: "border-box", minHeight: 48 }} />
            </div>
            <div style={{ paddingBottom: 4 }}>
              <div style={{ color: "#93c5fd", fontFamily: T.mono, fontWeight: 700, fontSize: 17, whiteSpace: "nowrap" }}>
                = {fmt(svcPrice(s))}
              </div>
            </div>
          </div>
        </Surface>
      ))}
      <PrimaryBtn onClick={save} color={saved ? "#16a34a" : T.accent}>
        {saved ? "✓ Saved" : "Save Rates"}
      </PrimaryBtn>
    </div>
  );
}

export default function App() {
  const [jobs, setJobs] = useState(() => loadData(JOBS_KEY, []));
  const [customers, setCustomers] = useState(() => loadData(CUSTOMERS_KEY, []));
  const [services, setServices] = useState(() => loadData(RATES_KEY, DEFAULT_SERVICES));
  const [screen, setScreen] = useState("home");
  const [navTab, setNavTab] = useState("jobs");
  const [selJobId, setSelJobId] = useState(null);

  const setJ = (j) => { setJobs(j); saveData(JOBS_KEY, j); };
  const setC = (c) => { setCustomers(c); saveData(CUSTOMERS_KEY, c); };
  const setS = (s) => { setServices(s); saveData(RATES_KEY, s); };

  const handleNewJob = (job, newCust) => {
    if (newCust) { const c = [...customers, newCust]; setC(c); }
    const j = [job, ...jobs]; setJ(j);
    setSelJobId(job.id);
    setScreen("job");
  };

  const handleUpdateJob = (updated) => {
    setJobs(prev => {
      const next = prev.map(j => j.id === updated.id ? updated : j);
      saveData(JOBS_KEY, next);
      return next;
    });
  };

  const selJob = jobs.find(j => j.id === selJobId);
  const selCust = selJob ? customers.find(c => c.id === selJob.customerId) : null;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      paddingBottom: screen === "job" ? 24 : 90 }}>
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "16px 18px", display: "flex", justifyContent: "space-between",
        alignItems: "center", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em" }}>⚙ Repair CRM</span>
        {screen === "new" && (
          <button onClick={() => setScreen("home")}
            style={{ background: "none", border: "none", color: T.muted,
              fontSize: 15, cursor: "pointer", minHeight: 44, padding: "0 4px" }}>
            Cancel
          </button>
        )}
      </div>
      <div style={{ padding: "18px 16px", maxWidth: 520, margin: "0 auto" }}>
        {screen === "home" && navTab === "jobs" && (
          <Dashboard jobs={jobs} customers={customers}
            onSelect={id => { setSelJobId(id); setScreen("job"); }}
            onNew={() => setScreen("new")} />
        )}
        {screen === "home" && navTab === "rates" && <Rates services={services} onSave={setS} />}
        {screen === "new" && <NewJob customers={customers} onSave={handleNewJob} onCancel={() => setScreen("home")} />}
        {screen === "job" && selJob && (
          <JobDetail job={selJob} customer={selCust} allServices={services}
            onUpdate={handleUpdateJob} onBack={() => setScreen("home")} />
        )}
      </div>
      {screen === "home" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: T.surface, borderTop: `1px solid ${T.border}`,
          display: "flex", paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}>
          {[["jobs","Jobs","💼"],["rates","Rates","⚙"]].map(([k,l,icon]) => (
            <button key={k} onClick={() => setNavTab(k)}
              style={{
                flex: 1, background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "12px 0", minHeight: 60,
                borderTop: `2px solid ${navTab===k ? T.accent : "transparent"}`,
              }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: navTab===k ? "#60a5fa" : T.dim }}>{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
