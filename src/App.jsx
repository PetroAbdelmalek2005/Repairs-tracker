import { useState } from "react";

const JOBS_KEY = "ser-jobs-v3";
const CUSTOMERS_KEY = "ser-customers-v3";
const RATES_KEY = "ser-rates-v3";
const INVENTORY_KEY = "ser-inventory-v3";
const FLIPS_KEY = "ser-flips-v3";

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
const INTERNAL_HOURLY = 25;
const svcPrice = (s) => Math.ceil((s.hours * HOURLY * s.margin) / 5) * 5;
const fmt = (n) => `$${Number(n || 0).toFixed(2)}`;
const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const today = () => new Date().toLocaleDateString("en-CA");
const jobProfit = (j) => (j.total || 0) - (j.partsTotal || 0) - ((j.timeInvested || 0) * INTERNAL_HOURLY);
const flipProfit = (f) => (f.sellPrice || 0) - (f.buyPrice || 0) - (f.partsSpent || 0) - ((f.timeSpent || 0) * INTERNAL_HOURLY);

const STATUSES = [
  { key: "new",       label: "New",          color: "#60a5fa", bg: "#172554" },
  { key: "diag",      label: "Diagnosing",   color: "#fbbf24", bg: "#1c1400" },
  { key: "approved",  label: "Approved",     color: "#c084fc", bg: "#1e1030" },
  { key: "wip",       label: "In Progress",  color: "#34d399", bg: "#022c22" },
  { key: "ready",     label: "Ready Pickup", color: "#fb923c", bg: "#1c0e00" },
  { key: "paid",      label: "Paid ✓",       color: "#6b7280", bg: "#111827" },
  { key: "cancelled", label: "Cancelled",    color: "#f87171", bg: "#1f1315" },
];
const FLOW_STATUSES = STATUSES.filter(s => s.key !== "cancelled");
const getSt = (k) => STATUSES.find(s => s.key === k) || STATUSES[0];
const nextSt = (k) => {
  const i = FLOW_STATUSES.findIndex(s => s.key === k);
  return FLOW_STATUSES[Math.min(i + 1, FLOW_STATUSES.length - 1)].key;
};
const prevSt = (k) => {
  const i = FLOW_STATUSES.findIndex(s => s.key === k);
  return i > 0 ? FLOW_STATUSES[i - 1].key : null;
};

const FLIP_STATUSES = [
  { key: "acquired", label: "Acquired",  color: "#60a5fa", bg: "#172554" },
  { key: "fixing",   label: "Fixing",    color: "#fbbf24", bg: "#1c1400" },
  { key: "listed",   label: "Listed",    color: "#c084fc", bg: "#1e1030" },
  { key: "sold",     label: "Sold ✓",    color: "#34d399", bg: "#022c22" },
];
const getFlipSt = (k) => FLIP_STATUSES.find(s => s.key === k) || FLIP_STATUSES[0];
const nextFlipSt = (k) => {
  const i = FLIP_STATUSES.findIndex(s => s.key === k);
  return FLIP_STATUSES[Math.min(i + 1, FLIP_STATUSES.length - 1)].key;
};

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
  accent: "#3b82f6", green: "#22c55e", red: "#ef4444",
  mono: "'JetBrains Mono', 'Fira Mono', monospace",
};

function Pill({ statusKey, statuses }) {
  const list = statuses || STATUSES;
  const s = list.find(x => x.key === statusKey) || list[0];
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

function StatCard({ label, value, color }) {
  return (
    <Surface style={{ flex: 1, padding: "14px 16px", minWidth: 0 }}>
      <div style={{ color: T.muted, fontSize: 11, fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800, fontFamily: T.mono,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
    </Surface>
  );
}

function FilterTabs({ options, active, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {options.map(([k, l]) => (
        <button key={k} onClick={() => onChange(k)}
          style={{
            background: active === k ? T.accent : T.surface,
            color: active === k ? "#fff" : T.muted,
            border: `1px solid ${active === k ? T.accent : T.border}`,
            borderRadius: 99, padding: "8px 18px", fontSize: 13,
            fontWeight: 600, cursor: "pointer", minHeight: 36,
          }}>{l}</button>
      ))}
    </div>
  );
}

function FAB({ onClick }) {
  return (
    <button onClick={onClick}
      style={{
        position: "fixed", bottom: 90, right: 20, width: 60, height: 60,
        borderRadius: 99, background: T.accent, color: "#fff", border: "none",
        fontSize: 32, cursor: "pointer", boxShadow: "0 4px 24px rgba(59,130,246,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5,
      }}>+</button>
  );
}

function EditableField({ value, onSave, fontSize = 22, fontWeight = 800, color = T.text, placeholder = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  if (editing) {
    return (
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder}
          autoFocus
          style={{
            flex: 1, background: T.bg, border: `1.5px solid ${T.accent}`, borderRadius: 8,
            padding: "8px 10px", color: T.text, fontSize: fontSize - 2, fontWeight,
            outline: "none", minWidth: 0,
          }} />
        <button onClick={() => { onSave(draft); setEditing(false); }}
          style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8,
            padding: "8px 14px", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
          ✓
        </button>
      </div>
    );
  }
  return (
    <div onClick={() => { setDraft(value); setEditing(true); }}
      style={{ color, fontSize, fontWeight, cursor: "pointer",
        borderBottom: `1px dashed ${T.dim}`, paddingBottom: 2, display: "inline-block" }}>
      {value || <span style={{ color: T.dim }}>{placeholder || "Tap to edit"}</span>}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────

function Dashboard({ jobs, flips, customers, onSelect, onNew }) {
  const [filter, setFilter] = useState("active");
  const activeKeys = ["new", "diag", "approved", "wip", "ready"];
  const visible = filter === "active" ? jobs.filter(j => activeKeys.includes(j.status))
    : filter === "paid" ? jobs.filter(j => j.status === "paid")
    : filter === "cancelled" ? jobs.filter(j => j.status === "cancelled")
    : jobs;
  const revenue = jobs.filter(j => j.status === "paid").reduce((s, j) => s + (j.total || 0), 0);
  const open = jobs.filter(j => activeKeys.includes(j.status)).length;
  const totalJobProfit = jobs.filter(j => j.status === "paid").reduce((s, j) => s + jobProfit(j), 0);
  const totalFlipProfit = flips.filter(f => f.status === "sold").reduce((s, f) => s + flipProfit(f), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Open" value={open} color="#60a5fa" />
        <StatCard label="Revenue" value={fmt(revenue)} color={T.green} />
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Job Profit" value={fmt(totalJobProfit)}
          color={totalJobProfit >= 0 ? T.green : T.red} />
        <StatCard label="Flip Profit" value={fmt(totalFlipProfit)}
          color={totalFlipProfit >= 0 ? T.green : T.red} />
      </div>
      <FilterTabs options={[["active","Active"],["paid","Paid"],["cancelled","Cancelled"],["all","All"]]}
        active={filter} onChange={setFilter} />
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
                <div>
                  <div style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>
                    {job.name || cust?.name || "Unknown"}
                  </div>
                  {job.name && cust?.name && (
                    <div style={{ color: T.muted, fontSize: 12, marginTop: 2 }}>{cust.name}</div>
                  )}
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
      <FAB onClick={onNew} />
    </div>
  );
}

// ─── NEW JOB ──────────────────────────────────────────────

function NewJob({ customers, onSave, onCancel }) {
  const [mode, setMode] = useState("new");
  const [existingId, setExistingId] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [equipType, setEquipType] = useState("");
  const [equipMake, setEquipMake] = useState("");
  const [jobName, setJobName] = useState("");
  const [notes, setNotes] = useState("");
  const valid = mode === "existing" ? !!existingId : !!name;

  const submit = () => {
    let cid = existingId, newCust = null;
    if (mode === "new") {
      cid = genId();
      newCust = { id: cid, name, phone, createdAt: today() };
    }
    const custName = mode === "new" ? name : (customers.find(c => c.id === existingId)?.name || "");
    const autoName = jobName || [custName, equipType].filter(Boolean).join(" – ") || "Untitled Job";
    onSave({
      id: genId(), customerId: cid, name: autoName, equipType, equipMake, notes,
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
        <Label>Job Name (optional)</Label>
        <TInput value={jobName} onChange={setJobName} placeholder="e.g. Honda mower tune-up" />
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

// ─── JOB DETAIL ───────────────────────────────────────────

function JobDetail({ job, customer, allServices, inventory, onUpdate, onUpdateCustomer, onUpdateInventory, onBack, onMoveToFlip }) {
  const [tab, setTab] = useState("overview");
  const [partName, setPartName] = useState("");
  const [partCost, setPartCost] = useState("");
  const [noteText, setNoteText] = useState("");
  const [timeInput, setTimeInput] = useState(job.timeInvested?.toString() || "0");
  const [editTime, setEditTime] = useState(false);
  const [showInvPicker, setShowInvPicker] = useState(false);

  const recalc = (svcs, parts) => {
    const labour = svcs.reduce((s, x) => s + x.price, 0);
    const pt = parts.reduce((s, x) => s + x.cost, 0);
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
    const updated = [...job.parts, { id: genId(), name: partName, cost: parseFloat(partCost) || 0 }];
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
    setPartName(""); setPartCost("");
  };

  const addFromInventory = (item) => {
    if (item.qty <= 0) return;
    const updated = [...job.parts, { id: genId(), name: item.name, cost: item.costEach }];
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
    onUpdateInventory(inventory.map(i => i.id === item.id ? { ...i, qty: i.qty - 1 } : i));
    setShowInvPicker(false);
  };

  const removePart = (id) => {
    const updated = job.parts.filter(p => p.id !== id);
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
  };

  const editPartCost = (id, val) => {
    const updated = job.parts.map(p => p.id === id ? { ...p, cost: parseFloat(val) || 0 } : p);
    onUpdate({ ...job, parts: updated, ...recalc(job.services, updated) });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const history = [...(job.history || []), { date: today(), note: noteText.trim() }];
    onUpdate({ ...job, history });
    setNoteText("");
  };

  const advance = () => {
    const ns = nextSt(job.status);
    const history = [...(job.history || []), { date: today(), note: `→ ${getSt(ns).label}` }];
    onUpdate({ ...job, status: ns, history });
  };

  const goBack = () => {
    const ps = prevSt(job.status);
    if (!ps) return;
    const history = [...(job.history || []), { date: today(), note: `← ${getSt(ps).label}` }];
    onUpdate({ ...job, status: ps, history });
  };

  const cancelJob = () => {
    if (!window.confirm("Cancel this job? This can't be undone.")) return;
    const history = [...(job.history || []), { date: today(), note: "→ Cancelled" }];
    onUpdate({ ...job, status: "cancelled", history });
  };

  const st = getSt(job.status);
  const isTerminal = job.status === "paid" || job.status === "cancelled";
  const profit = jobProfit(job);
  const estHours = job.services.reduce((s, x) => s + (x.hours || 0), 0);
  const actualHours = job.timeInvested || 0;
  const overTime = actualHours > estHours && estHours > 0;

  const TABS = [
    { key: "overview", icon: "◎", label: "Overview" },
    { key: "work", icon: "🔧", label: `Work${job.services.length ? ` (${job.services.length})` : ""}` },
    { key: "parts", icon: "📦", label: `Parts${job.parts.length ? ` (${job.parts.length})` : ""}` },
    { key: "log", icon: "📋", label: "Log" },
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
            <EditableField value={job.name || ""} placeholder="Job name"
              onSave={(v) => onUpdate({ ...job, name: v })} />
            <div style={{ marginTop: 4 }}>
              <EditableField value={customer?.name || ""} placeholder="Customer name"
                fontSize={15} fontWeight={600} color={T.muted}
                onSave={(v) => customer && onUpdateCustomer({ ...customer, name: v })} />
            </div>
            <div style={{ marginTop: 4 }}>
              <EditableField value={job.equipType || ""} placeholder="Equipment type"
                fontSize={14} fontWeight={400} color={T.muted}
                onSave={(v) => onUpdate({ ...job, equipType: v })} />
              <span style={{ color: T.dim }}> · </span>
              <EditableField value={job.equipMake || ""} placeholder="Make & model"
                fontSize={14} fontWeight={400} color={T.muted}
                onSave={(v) => onUpdate({ ...job, equipMake: v })} />
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
      {!isTerminal && (
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          {prevSt(job.status) && (
            <button onClick={goBack}
              style={{
                background: T.surface, border: `1.5px solid ${T.border}`,
                color: T.muted, borderRadius: 12, padding: "14px 12px",
                fontWeight: 700, fontSize: 15, cursor: "pointer", minHeight: 52,
              }}>
              ← {getSt(prevSt(job.status)).label}
            </button>
          )}
          <button onClick={advance}
            style={{
              flex: 1, background: st.bg, border: `1.5px solid ${st.color}55`,
              color: st.color, borderRadius: 12, padding: "14px 16px",
              fontWeight: 700, fontSize: 15, cursor: "pointer", minHeight: 52,
            }}>
            {getSt(nextSt(job.status)).label} →
          </button>
          <button onClick={cancelJob}
            style={{
              background: "#1f1315", border: "1.5px solid #f8717155",
              color: "#f87171", borderRadius: 12, padding: "14px 16px",
              fontWeight: 700, fontSize: 15, cursor: "pointer", minHeight: 52,
            }}>
            Cancel
          </button>
        </div>
      )}
      {!isTerminal && (
        <button onClick={() => {
          if (window.confirm("Convert this job to a flip? The job will be removed and a new flip entry created.")) {
            onMoveToFlip();
          }
        }}
          style={{
            background: "none", border: `1.5px solid ${T.border}`,
            color: "#c084fc", borderRadius: 12, padding: "12px 16px",
            fontWeight: 600, fontSize: 14, cursor: "pointer",
            width: "100%", marginBottom: 16, minHeight: 48,
          }}>
          🔄 Move to Flip
        </button>
      )}
      <div style={{ display: "flex", borderBottom: `1.5px solid ${T.border}`, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: `2.5px solid ${tab === t.key ? T.accent : "transparent"}`,
              color: tab === t.key ? "#60a5fa" : T.dim,
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
            <Label>Financials</Label>
            {[["Labour", job.labourTotal], ["Parts", job.partsTotal]].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: `1px solid ${T.border}`,
                color: T.muted, fontSize: 15 }}>
                <span>{l}</span><span style={{ fontFamily: T.mono }}>{fmt(v)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between",
              padding: "10px 0", borderBottom: `1px solid ${T.border}`,
              color: T.muted, fontSize: 15 }}>
              <span>My Time ({actualHours}h × ${INTERNAL_HOURLY})</span>
              <span style={{ fontFamily: T.mono }}>−{fmt(actualHours * INTERNAL_HOURLY)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, alignItems: "center" }}>
              <span style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>Total</span>
              <span style={{ color: "#93c5fd", fontFamily: T.mono, fontWeight: 800, fontSize: 24 }}>{fmt(job.total)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, alignItems: "center" }}>
              <span style={{ color: T.muted, fontWeight: 700, fontSize: 15 }}>Profit</span>
              <span style={{ color: profit >= 0 ? T.green : T.red, fontFamily: T.mono, fontWeight: 800, fontSize: 20 }}>
                {profit >= 0 ? "+" : ""}{fmt(profit)}
              </span>
            </div>
          </Surface>

          <Surface>
            <Label>Time</Label>
            {estHours > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, fontSize: 14 }}>
                <span style={{ color: T.muted }}>Estimated</span>
                <span style={{ color: T.muted, fontFamily: T.mono }}>{estHours} hrs</span>
              </div>
            )}
            {editTime ? (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input type="number" step="0.25" value={timeInput} onChange={e => setTimeInput(e.target.value)}
                  style={{ width: 90, background: T.bg, border: `1.5px solid ${T.border}`,
                    borderRadius: 10, padding: 12, color: T.text, fontSize: 16, outline: "none" }} />
                <span style={{ color: T.muted, fontSize: 15 }}>hrs</span>
                <button onClick={() => { onUpdate({ ...job, timeInvested: parseFloat(timeInput) || 0 }); setEditTime(false); }}
                  style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 10,
                    padding: "12px 18px", fontWeight: 700, cursor: "pointer", fontSize: 15, minHeight: 48 }}>
                  Save
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: overTime ? "#fbbf24" : T.text, fontFamily: T.mono, fontSize: 22, fontWeight: 800 }}>
                  {actualHours} hrs {overTime ? "⚠" : ""}
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
              {inventory.length > 0 && (
                <button onClick={() => setShowInvPicker(!showInvPicker)}
                  style={{
                    background: showInvPicker ? T.accent : T.bg, color: showInvPicker ? "#fff" : "#60a5fa",
                    border: `1.5px solid ${showInvPicker ? T.accent : T.border}`,
                    borderRadius: 10, padding: "12px 16px", fontSize: 14,
                    fontWeight: 600, cursor: "pointer", width: "100%", minHeight: 48,
                  }}>
                  📦 {showInvPicker ? "Hide Inventory" : "From Inventory"}
                </button>
              )}
            </div>
          </Surface>
          {showInvPicker && (
            <Surface>
              <Label>Pick from inventory</Label>
              {inventory.filter(i => i.qty > 0).length === 0
                ? <div style={{ color: T.dim, fontSize: 14, padding: "8px 0" }}>No items in stock</div>
                : inventory.filter(i => i.qty > 0).map(item => (
                  <button key={item.id} onClick={() => addFromInventory(item)}
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      width: "100%", padding: "12px 0", background: "none", border: "none",
                      borderBottom: `1px solid ${T.border}`, cursor: "pointer", minHeight: 48,
                    }}>
                    <div>
                      <div style={{ color: T.text, fontSize: 15, textAlign: "left" }}>{item.name}</div>
                      <div style={{ color: T.dim, fontSize: 12 }}>{item.qty} in stock</div>
                    </div>
                    <span style={{ color: "#93c5fd", fontFamily: T.mono, fontWeight: 700, fontSize: 14 }}>
                      {fmt(item.costEach)}
                    </span>
                  </button>
                ))
              }
            </Surface>
          )}
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
          {[...(job.history || [])].reverse().map((h, i) => (
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

// ─── INVENTORY ────────────────────────────────────────────

function Inventory({ items, onSave }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [cost, setCost] = useState("");
  const [editId, setEditId] = useState(null);
  const [editQty, setEditQty] = useState("");
  const [editCost, setEditCost] = useState("");

  const addItem = () => {
    if (!name) return;
    const item = { id: genId(), name, qty: parseInt(qty) || 0, costEach: parseFloat(cost) || 0, createdAt: today() };
    onSave([item, ...items]);
    setName(""); setQty(""); setCost("");
  };

  const deleteItem = (id) => {
    if (!window.confirm("Delete this item?")) return;
    onSave(items.filter(i => i.id !== id));
  };

  const startEdit = (item) => {
    setEditId(item.id);
    setEditQty(item.qty.toString());
    setEditCost(item.costEach.toString());
  };

  const saveEdit = (id) => {
    onSave(items.map(i => i.id === id
      ? { ...i, qty: parseInt(editQty) || 0, costEach: parseFloat(editCost) || 0 }
      : i
    ));
    setEditId(null);
  };

  const qtyColor = (q) => q >= 3 ? T.green : q >= 1 ? "#fbbf24" : T.red;
  const totalValue = items.reduce((s, i) => s + i.qty * i.costEach, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>Inventory</div>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Items" value={items.length} color="#60a5fa" />
        <StatCard label="Value" value={fmt(totalValue)} color="#93c5fd" />
      </div>
      <Surface>
        <Label>Add Item</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <TInput value={name} onChange={setName} placeholder="Part name" />
          <div style={{ display: "flex", gap: 10 }}>
            <TInput value={qty} onChange={setQty} placeholder="Qty" type="number" style={{ flex: 1 }} />
            <TInput value={cost} onChange={setCost} placeholder="Cost $" type="number" style={{ flex: 1 }} />
            <button onClick={addItem}
              style={{
                background: T.accent, color: "#fff", border: "none",
                borderRadius: 10, padding: "0 20px", fontWeight: 700,
                cursor: "pointer", fontSize: 24, minHeight: 52, minWidth: 52,
              }}>+</button>
          </div>
        </div>
      </Surface>
      {items.length === 0
        ? <div style={{ color: T.dim, textAlign: "center", padding: "60px 0", fontSize: 15 }}>
            No inventory — add parts above
          </div>
        : items.map(item => (
          <div key={item.id} style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 12, padding: "14px 16px",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: editId === item.id ? 12 : 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: T.text, fontSize: 16, fontWeight: 600 }}>{item.name}</div>
                {editId !== item.id && (
                  <div style={{ color: T.muted, fontSize: 13, marginTop: 2 }}>
                    {fmt(item.costEach)} each
                  </div>
                )}
              </div>
              {editId !== item.id && (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ color: qtyColor(item.qty), fontFamily: T.mono, fontWeight: 800, fontSize: 22 }}>
                    {item.qty}
                  </div>
                  <button onClick={() => startEdit(item)}
                    style={{ background: "none", border: `1px solid ${T.border}`, borderRadius: 8,
                      color: T.muted, padding: "6px 12px", fontSize: 13, cursor: "pointer", minHeight: 36 }}>
                    Edit
                  </button>
                </div>
              )}
            </div>
            {editId === item.id && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <Label>Qty</Label>
                  <input type="number" value={editQty} onChange={e => setEditQty(e.target.value)}
                    style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
                      borderRadius: 8, padding: 10, color: T.text, fontSize: 16, outline: "none",
                      boxSizing: "border-box" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <Label>Cost $</Label>
                  <input type="number" value={editCost} onChange={e => setEditCost(e.target.value)}
                    style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
                      borderRadius: 8, padding: 10, color: T.text, fontSize: 16, outline: "none",
                      boxSizing: "border-box" }} />
                </div>
                <button onClick={() => saveEdit(item.id)}
                  style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 8,
                    padding: "10px 16px", fontWeight: 700, cursor: "pointer", fontSize: 14, marginTop: 20, minHeight: 44 }}>
                  Save
                </button>
                <button onClick={() => deleteItem(item.id)}
                  style={{ background: "none", border: "none", color: T.red,
                    cursor: "pointer", fontSize: 20, marginTop: 20, minHeight: 44, minWidth: 36 }}>×</button>
              </div>
            )}
          </div>
        ))
      }
    </div>
  );
}

// ─── FLIPS ────────────────────────────────────────────────

function FlipsDashboard({ flips, onSelect, onNew }) {
  const [filter, setFilter] = useState("active");
  const activeKeys = ["acquired", "fixing", "listed"];
  const visible = filter === "active" ? flips.filter(f => activeKeys.includes(f.status))
    : filter === "sold" ? flips.filter(f => f.status === "sold")
    : flips;
  const totalProfit = flips.filter(f => f.status === "sold").reduce((s, f) => s + flipProfit(f), 0);
  const activeCount = flips.filter(f => activeKeys.includes(f.status)).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>Flips</div>
      <div style={{ display: "flex", gap: 10 }}>
        <StatCard label="Active" value={activeCount} color="#60a5fa" />
        <StatCard label="Flip Profit" value={fmt(totalProfit)}
          color={totalProfit >= 0 ? T.green : T.red} />
      </div>
      <FilterTabs options={[["active", "Active"], ["sold", "Sold"], ["all", "All"]]}
        active={filter} onChange={setFilter} />
      {visible.length === 0
        ? <div style={{ color: T.dim, textAlign: "center", padding: "60px 0", fontSize: 15 }}>
            No flips — tap + to add one
          </div>
        : visible.map(flip => (
          <button key={flip.id} onClick={() => onSelect(flip.id)}
            style={{
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 14, padding: 16, cursor: "pointer",
              textAlign: "left", width: "100%", minHeight: 70,
            }}>
            <div style={{ display: "flex", justifyContent: "space-between",
              alignItems: "flex-start", marginBottom: 8 }}>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>{flip.name}</div>
              <Pill statusKey={flip.status} statuses={FLIP_STATUSES} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: T.muted, fontSize: 13 }}>
                Bought: {flip.buyPrice > 0 ? fmt(flip.buyPrice) : "Free"}
              </div>
              {flip.status === "sold" && (
                <div style={{ color: flipProfit(flip) >= 0 ? T.green : T.red,
                  fontFamily: T.mono, fontWeight: 700, fontSize: 15 }}>
                  {flipProfit(flip) >= 0 ? "+" : ""}{fmt(flipProfit(flip))}
                </div>
              )}
            </div>
          </button>
        ))
      }
      <FAB onClick={onNew} />
    </div>
  );
}

function NewFlip({ onSave, onCancel }) {
  const [name, setName] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    if (!name) return;
    onSave({
      id: genId(), name, status: "acquired",
      buyPrice: parseFloat(buyPrice) || 0,
      partsSpent: 0, timeSpent: 0, sellPrice: 0,
      createdAt: today(), soldAt: null, notes,
      history: [{ date: today(), note: "Machine acquired" }],
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: T.text, fontWeight: 800, fontSize: 22 }}>New Flip</div>
      <Surface>
        <Label>Machine</Label>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><Label>Name / Description</Label><TInput value={name} onChange={setName} placeholder="Husqvarna 450 Rancher" /></div>
          <div><Label>Buy Price (0 if free)</Label><TInput value={buyPrice} onChange={setBuyPrice} placeholder="0" type="number" /></div>
        </div>
      </Surface>
      <Surface>
        <Label>Notes</Label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
          placeholder="Where you got it, condition…"
          style={{
            background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10,
            padding: 14, color: T.text, fontSize: 16, outline: "none",
            resize: "vertical", width: "100%", boxSizing: "border-box", lineHeight: 1.5,
          }} />
      </Surface>
      <div style={{ display: "flex", gap: 10 }}>
        <GhostBtn onClick={onCancel}>Cancel</GhostBtn>
        <div style={{ flex: 1 }}><PrimaryBtn onClick={submit} disabled={!name}>Add Flip</PrimaryBtn></div>
      </div>
    </div>
  );
}

function FlipDetail({ flip, onUpdate, onBack }) {
  const [tab, setTab] = useState("overview");
  const [noteText, setNoteText] = useState("");
  const [editBuy, setEditBuy] = useState(false);
  const [buyInput, setBuyInput] = useState(flip.buyPrice?.toString() || "0");
  const [editParts, setEditParts] = useState(false);
  const [partsInput, setPartsInput] = useState(flip.partsSpent?.toString() || "0");
  const [editTime, setEditTime] = useState(false);
  const [timeInput, setTimeInput] = useState(flip.timeSpent?.toString() || "0");
  const [editSell, setEditSell] = useState(false);
  const [sellInput, setSellInput] = useState(flip.sellPrice?.toString() || "0");

  const st = getFlipSt(flip.status);
  const isSold = flip.status === "sold";
  const profit = flipProfit(flip);

  const advance = () => {
    const ns = nextFlipSt(flip.status);
    if (ns === "sold") {
      const price = prompt("Sell price?");
      if (price === null) return;
      const sp = parseFloat(price) || 0;
      const history = [...(flip.history || []), { date: today(), note: `→ Sold for ${fmt(sp)}` }];
      onUpdate({ ...flip, status: "sold", sellPrice: sp, soldAt: today(), history });
      setSellInput(sp.toString());
      return;
    }
    const history = [...(flip.history || []), { date: today(), note: `→ ${getFlipSt(ns).label}` }];
    onUpdate({ ...flip, status: ns, history });
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    const history = [...(flip.history || []), { date: today(), note: noteText.trim() }];
    onUpdate({ ...flip, history });
    setNoteText("");
  };

  const TABS = [
    { key: "overview", icon: "◎", label: "Overview" },
    { key: "log", icon: "📋", label: "Log" },
  ];

  const numEditor = (label, editing, setEditing, input, setInput, field, prefix = "") => (
    <Surface>
      <Label>{label}</Label>
      {editing ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {prefix && <span style={{ color: T.muted, fontSize: 16 }}>{prefix}</span>}
          <input type="number" step={field === "timeSpent" ? "0.25" : "1"} value={input}
            onChange={e => setInput(e.target.value)}
            style={{ width: 120, background: T.bg, border: `1.5px solid ${T.border}`,
              borderRadius: 10, padding: 12, color: T.text, fontSize: 16, outline: "none" }} />
          {field === "timeSpent" && <span style={{ color: T.muted, fontSize: 15 }}>hrs</span>}
          <button onClick={() => { onUpdate({ ...flip, [field]: parseFloat(input) || 0 }); setEditing(false); }}
            style={{ background: T.accent, color: "#fff", border: "none", borderRadius: 10,
              padding: "12px 18px", fontWeight: 700, cursor: "pointer", fontSize: 15, minHeight: 48 }}>
            Save
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ color: T.text, fontFamily: T.mono, fontSize: 22, fontWeight: 800 }}>
            {field === "timeSpent" ? `${flip[field] || 0} hrs` : fmt(flip[field])}
          </span>
          <GhostBtn onClick={() => { setInput((flip[field] || 0).toString()); setEditing(true); }}>Edit</GhostBtn>
        </div>
      )}
    </Surface>
  );

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
            <EditableField value={flip.name} placeholder="Machine name"
              onSave={(v) => onUpdate({ ...flip, name: v })} />
          </div>
          <Pill statusKey={flip.status} statuses={FLIP_STATUSES} />
        </div>
      </div>

      {!isSold && (
        <button onClick={advance}
          style={{
            background: st.bg, border: `1.5px solid ${st.color}55`,
            color: st.color, borderRadius: 12, padding: "14px 16px",
            fontWeight: 700, fontSize: 15, cursor: "pointer",
            marginBottom: 16, width: "100%", minHeight: 52,
          }}>
          Mark as {getFlipSt(nextFlipSt(flip.status)).label} →
        </button>
      )}

      <div style={{ display: "flex", borderBottom: `1.5px solid ${T.border}`, marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              flex: 1, background: "none", border: "none",
              borderBottom: `2.5px solid ${tab === t.key ? T.accent : "transparent"}`,
              color: tab === t.key ? "#60a5fa" : T.dim,
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
          {numEditor("Buy Price", editBuy, setEditBuy, buyInput, setBuyInput, "buyPrice", "$")}
          {numEditor("Parts Spent", editParts, setEditParts, partsInput, setPartsInput, "partsSpent", "$")}
          {numEditor("Time Spent", editTime, setEditTime, timeInput, setTimeInput, "timeSpent")}
          {isSold && numEditor("Sell Price", editSell, setEditSell, sellInput, setSellInput, "sellPrice", "$")}

          <Surface style={{ borderColor: profit >= 0 ? `${T.green}44` : `${T.red}44` }}>
            <Label>Profit Breakdown</Label>
            {[
              ["Sell Price", flip.sellPrice || 0],
              ["Buy Price", -(flip.buyPrice || 0)],
              ["Parts", -(flip.partsSpent || 0)],
              [`My Time (${flip.timeSpent || 0}h × $${INTERNAL_HOURLY})`, -((flip.timeSpent || 0) * INTERNAL_HOURLY)],
            ].map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: `1px solid ${T.border}`,
                color: T.muted, fontSize: 14 }}>
                <span>{l}</span>
                <span style={{ fontFamily: T.mono }}>{v >= 0 ? "" : "−"}{fmt(Math.abs(v))}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 12, alignItems: "center" }}>
              <span style={{ color: T.text, fontWeight: 700, fontSize: 17 }}>
                {isSold ? "Profit" : "Projected"}
              </span>
              <span style={{ color: profit >= 0 ? T.green : T.red,
                fontFamily: T.mono, fontWeight: 800, fontSize: 24 }}>
                {profit >= 0 ? "+" : ""}{fmt(profit)}
              </span>
            </div>
          </Surface>

          {flip.notes && (
            <Surface>
              <Label>Notes</Label>
              <div style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.6 }}>{flip.notes}</div>
            </Surface>
          )}
          <div style={{ color: T.dim, fontSize: 12, textAlign: "center", padding: "8px 0" }}>
            Acquired {flip.createdAt}{flip.soldAt ? ` · Sold ${flip.soldAt}` : ""}
          </div>
        </div>
      )}

      {tab === "log" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Surface>
            <Label>Add Note</Label>
            <div style={{ display: "flex", gap: 10 }}>
              <input value={noteText} onChange={e => setNoteText(e.target.value)}
                placeholder="What did you do?"
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
          {[...(flip.history || [])].reverse().map((h, i) => (
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

// ─── RATES ────────────────────────────────────────────────

function Rates({ services, onSave }) {
  const [local, setLocal] = useState(services.map(s => ({ ...s })));
  const [saved, setSaved] = useState(false);
  const upd = (id, field, val) =>
    setLocal(l => l.map(s => s.id === id ? { ...s, [field]: parseFloat(val) || 0 } : s));
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
              <input type="number" step="0.25" value={s.hours} onChange={e => upd(s.id, "hours", e.target.value)}
                style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`,
                  borderRadius: 10, padding: 12, color: T.text, fontSize: 16,
                  outline: "none", boxSizing: "border-box", minHeight: 48 }} />
            </div>
            <div style={{ flex: 1 }}>
              <Label>Margin ×</Label>
              <input type="number" step="0.05" value={s.margin} onChange={e => upd(s.id, "margin", e.target.value)}
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

// ─── APP ──────────────────────────────────────────────────

export default function App() {
  const [jobs, setJobs] = useState(() => {
    const loaded = loadData(JOBS_KEY, []);
    return loaded.map(j => j.name != null ? j : { ...j, name: "" });
  });
  const [customers, setCustomers] = useState(() => loadData(CUSTOMERS_KEY, []));
  const [services, setServices] = useState(() => loadData(RATES_KEY, DEFAULT_SERVICES));
  const [inventory, setInventory] = useState(() => loadData(INVENTORY_KEY, []));
  const [flips, setFlips] = useState(() => loadData(FLIPS_KEY, []));
  const [screen, setScreen] = useState("home");
  const [navTab, setNavTab] = useState("jobs");
  const [selJobId, setSelJobId] = useState(null);
  const [selFlipId, setSelFlipId] = useState(null);

  const setJ = (j) => { setJobs(j); saveData(JOBS_KEY, j); };
  const setC = (c) => { setCustomers(c); saveData(CUSTOMERS_KEY, c); };
  const setS = (s) => { setServices(s); saveData(RATES_KEY, s); };
  const setI = (i) => { setInventory(i); saveData(INVENTORY_KEY, i); };
  const setF = (f) => { setFlips(f); saveData(FLIPS_KEY, f); };

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

  const handleUpdateCustomer = (updated) => {
    setCustomers(prev => {
      const next = prev.map(c => c.id === updated.id ? updated : c);
      saveData(CUSTOMERS_KEY, next);
      return next;
    });
  };

  const handleNewFlip = (flip) => {
    const f = [flip, ...flips]; setF(f);
    setSelFlipId(flip.id);
    setScreen("flip");
  };

  const handleUpdateFlip = (updated) => {
    setFlips(prev => {
      const next = prev.map(f => f.id === updated.id ? updated : f);
      saveData(FLIPS_KEY, next);
      return next;
    });
  };

  const handleMoveJobToFlip = (jobId) => {
    const job = jobs.find(j => j.id === jobId);
    if (!job) return;
    const cust = customers.find(c => c.id === job.customerId);
    const flip = {
      id: genId(),
      name: job.name || [cust?.name, job.equipType].filter(Boolean).join(" – ") || "Untitled Flip",
      status: "acquired",
      buyPrice: 0,
      partsSpent: job.partsTotal || 0,
      timeSpent: job.timeInvested || 0,
      sellPrice: 0,
      createdAt: today(),
      soldAt: null,
      notes: [job.notes, `Converted from job (created ${job.createdAt})`, cust ? `Customer: ${cust.name}` : null].filter(Boolean).join("\n"),
      history: [...(job.history || []), { date: today(), note: "Converted from repair job to flip" }],
    };
    const nextJobs = jobs.filter(j => j.id !== jobId);
    setJ(nextJobs);
    const nextFlips = [flip, ...flips];
    setF(nextFlips);
    setSelFlipId(flip.id);
    setScreen("flip");
  };

  const selJob = jobs.find(j => j.id === selJobId);
  const selCust = selJob ? customers.find(c => c.id === selJob.customerId) : null;
  const selFlip = flips.find(f => f.id === selFlipId);

  const detailScreen = screen === "job" || screen === "flip";

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text,
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      paddingBottom: detailScreen ? 24 : 90 }}>
      <div style={{
        background: T.surface, borderBottom: `1px solid ${T.border}`,
        padding: "16px 18px", display: "flex", justifyContent: "space-between",
        alignItems: "center", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-0.03em" }}>⚙ Repair CRM</span>
        {(screen === "new" || screen === "newFlip") && (
          <button onClick={() => setScreen("home")}
            style={{ background: "none", border: "none", color: T.muted,
              fontSize: 15, cursor: "pointer", minHeight: 44, padding: "0 4px" }}>
            Cancel
          </button>
        )}
      </div>
      <div style={{ padding: "18px 16px", maxWidth: 520, margin: "0 auto" }}>
        {screen === "home" && navTab === "jobs" && (
          <Dashboard jobs={jobs} flips={flips} customers={customers}
            onSelect={id => { setSelJobId(id); setScreen("job"); }}
            onNew={() => setScreen("new")} />
        )}
        {screen === "home" && navTab === "inventory" && (
          <Inventory items={inventory} onSave={setI} />
        )}
        {screen === "home" && navTab === "flips" && (
          <FlipsDashboard flips={flips}
            onSelect={id => { setSelFlipId(id); setScreen("flip"); }}
            onNew={() => setScreen("newFlip")} />
        )}
        {screen === "home" && navTab === "rates" && <Rates services={services} onSave={setS} />}
        {screen === "new" && <NewJob customers={customers} onSave={handleNewJob} onCancel={() => setScreen("home")} />}
        {screen === "newFlip" && <NewFlip onSave={handleNewFlip} onCancel={() => setScreen("home")} />}
        {screen === "job" && selJob && (
          <JobDetail job={selJob} customer={selCust} allServices={services}
            inventory={inventory}
            onUpdate={handleUpdateJob} onUpdateCustomer={handleUpdateCustomer}
            onUpdateInventory={setI}
            onBack={() => setScreen("home")}
            onMoveToFlip={() => handleMoveJobToFlip(selJobId)} />
        )}
        {screen === "flip" && selFlip && (
          <FlipDetail flip={selFlip} onUpdate={handleUpdateFlip}
            onBack={() => setScreen("home")} />
        )}
      </div>
      {screen === "home" && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          background: T.surface, borderTop: `1px solid ${T.border}`,
          display: "flex", paddingBottom: "env(safe-area-inset-bottom, 8px)",
        }}>
          {[["jobs","Jobs","💼"],["inventory","Inventory","📦"],["flips","Flips","🔄"],["rates","Rates","⚙"]].map(([k,l,icon]) => (
            <button key={k} onClick={() => setNavTab(k)}
              style={{
                flex: 1, background: "none", border: "none", cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 3, padding: "12px 0", minHeight: 60,
                borderTop: `2px solid ${navTab === k ? T.accent : "transparent"}`,
              }}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: navTab === k ? "#60a5fa" : T.dim }}>{l}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
