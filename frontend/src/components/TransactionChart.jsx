import { useState, useMemo, useCallback } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// ─── Utilitaires (hors composant → pas de recréation à chaque render) ────────

const extractHour = (transaction) => {
  if (transaction.time && typeof transaction.time === "string") {
    return transaction.time.split(":")[0].padStart(2, "0");
  }
  const ts = transaction.timestamp ?? transaction.created_at;
  if (ts) return String(new Date(ts).getHours()).padStart(2, "0");
  return "00";
};

const groupByHour = (transactions) => {
  const map = {};
  for (const t of transactions) {
    const key = `${extractHour(t)}:00`;
    if (!map[key]) map[key] = { hour: key, total: 0, count: 0 };
    map[key].total += t.amount ?? t.total ?? 0;
    map[key].count += 1;
  }
  return Object.values(map).sort((a, b) => a.hour.localeCompare(b.hour));
};

const groupByDay = (transactions) => {
  const map = {};
  for (const t of transactions) {
    const date = t.date ?? "";
    const day = date.split("-")[2] ?? "00";
    if (!map[day]) map[day] = { day, total: 0, count: 0 };
    map[day].total += t.amount ?? t.total ?? 0;
    map[day].count += 1;
  }
  return Object.values(map)
    .sort((a, b) => parseInt(a.day) - parseInt(b.day));
};

const sum = (transactions) =>
  transactions.reduce((acc, t) => acc + (t.amount ?? t.total ?? 0), 0);

const fmt = (n) => n.toFixed(2);

// ─── Styles centralisés ──────────────────────────────────────────────────────

const S = {
  container: { width: "100%", fontFamily: "var(--font-sans, sans-serif)" },
  toolbar: {
    marginBottom: 20,
    display: "flex",
    gap: 10,
    alignItems: "center",
    flexWrap: "wrap",
  },
  label: {
    fontWeight: 500,
    fontSize: 14,
    color: "var(--color-text-secondary)",
  },
  input: {
    padding: "7px 11px",
    borderRadius: "var(--border-radius-md, 8px)",
    border: "0.5px solid var(--color-border-secondary)",
    fontSize: 14,
    background: "var(--color-background-primary)",
    color: "var(--color-text-primary)",
    cursor: "pointer",
  },
  resetBtn: {
    padding: "7px 12px",
    borderRadius: "var(--border-radius-md, 8px)",
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-secondary)",
    color: "var(--color-text-secondary)",
    cursor: "pointer",
    fontSize: 14,
  },
  chartWrap: { width: "100%", height: 300, marginBottom: 30 },
  section: { marginTop: 20 },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 15,
    fontWeight: 500,
    color: "var(--color-text-primary)",
  },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    padding: "10px 12px",
    textAlign: "left",
    fontWeight: 500,
    fontSize: 12,
    color: "var(--color-text-secondary)",
    borderBottom: "0.5px solid var(--color-border-tertiary)",
    background: "var(--color-background-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  tdBase: { padding: "10px 12px" },
  summary: {
    marginTop: 16,
    padding: "12px 16px",
    background: "var(--color-background-secondary)",
    borderRadius: "var(--border-radius-md, 8px)",
    display: "flex",
    justifyContent: "space-between",
    fontWeight: 500,
    fontSize: 14,
    border: "0.5px solid var(--color-border-tertiary)",
  },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "var(--color-text-tertiary)",
    fontSize: 14,
  },
  amount: { fontWeight: 500, color: "var(--color-text-success)" },
  amountSummary: { color: "var(--color-text-success)" },
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-background-primary)",
    border: "0.5px solid var(--color-border-secondary)",
    borderRadius: 8,
    fontSize: 13,
  },
  labelStyle: { color: "var(--color-text-secondary)" },
};

// ─── Sous-composants ─────────────────────────────────────────────────────────

const DayTable = ({ transactions, date }) => (
  <div style={S.section}>
    <p style={S.sectionTitle}>Transactions du {date}</p>
    <div style={S.tableWrap}>
      <table style={S.table}>
        <thead>
          <tr>
            {["Heure", "Montant", "Détails"].map((h) => (
              <th key={h} style={S.th}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr
              key={i}
              style={{
                borderBottom: "0.5px solid var(--color-border-tertiary)",
                background:
                  i % 2 === 0
                    ? "var(--color-background-primary)"
                    : "var(--color-background-secondary)",
              }}
            >
              <td style={S.tdBase}>{t.time ?? "—"}</td>
              <td style={{ ...S.tdBase, ...S.amount }}>
                {fmt(t.amount ?? t.total ?? 0)}
              </td>
              <td style={{ ...S.tdBase, color: "var(--color-text-secondary)" }}>
                {t.description ?? t.type ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div style={S.summary}>
      <span>Total du jour</span>
      <span style={S.amountSummary}>{fmt(sum(transactions))}</span>
    </div>
  </div>
);

const MonthTable = ({ daylyData, month }) => {
  const monthDate = new Date(`${month}-01`);
  const monthLabel = monthDate.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const totalMonth = daylyData.reduce((sum, item) => sum + item.total, 0);

  return (
    <div style={S.section}>
      <p style={S.sectionTitle}>Transactions de {monthLabel}</p>
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Jour", "Montant", "Nombre de transactions"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {daylyData.map((item, i) => (
              <tr
                key={i}
                style={{
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  background:
                    i % 2 === 0
                      ? "var(--color-background-primary)"
                      : "var(--color-background-secondary)",
                }}
              >
                <td style={S.tdBase}>{item.day} {monthLabel}</td>
                <td style={{ ...S.tdBase, ...S.amount }}>
                  {fmt(item.total)}
                </td>
                <td style={{ ...S.tdBase, color: "var(--color-text-secondary)" }}>
                  {item.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={S.summary}>
        <span>Total du mois</span>
        <span style={S.amountSummary}>{fmt(totalMonth)}</span>
      </div>
    </div>
  );
};

// ─── Composant principal ─────────────────────────────────────────────────────

const TransactionChart = ({ data = [] }) => {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const handleDateChange = useCallback(
    (e) => setSelectedDate(e.target.value),
    []
  );
  const handleMonthChange = useCallback(
    (e) => setSelectedMonth(e.target.value),
    []
  );
  const handleReset = useCallback(() => {
    setSelectedDate("");
    setSelectedMonth("");
  }, []);

  const transactionsByDay = useMemo(
    () => (selectedDate ? data.filter((t) => t.date === selectedDate) : []),
    [data, selectedDate]
  );

  const transactionsByMonth = useMemo(
    () => (selectedMonth ? data.filter((t) => t.date?.startsWith(selectedMonth)) : []),
    [data, selectedMonth]
  );

  const hourlyData = useMemo(
    () => (selectedDate && transactionsByDay.length ? groupByHour(transactionsByDay) : []),
    [transactionsByDay, selectedDate]
  );

  const daylyData = useMemo(
    () => (selectedMonth && transactionsByMonth.length ? groupByDay(transactionsByMonth) : []),
    [transactionsByMonth, selectedMonth]
  );

  return (
    <div style={S.container}>
      {/* ── Barre d'outils ── */}
      <div style={S.toolbar}>
        <label htmlFor="dateFilter" style={S.label}>
          Filtrer par date
        </label>
        <input
          id="dateFilter"
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          disabled={selectedMonth !== ""}
          style={S.input}
        />

        <label htmlFor="monthFilter" style={S.label}>
          Filtrer par mois
        </label>
        <input
          id="monthFilter"
          type="month"
          value={selectedMonth}
          onChange={handleMonthChange}
          disabled={selectedDate !== ""}
          style={S.input}
        />

        {(selectedDate || selectedMonth) && (
          <button onClick={handleReset} style={S.resetBtn}>
            Réinitialiser
          </button>
        )}
      </div>

      {/* ── Vue globale ── */}
      {!selectedDate && !selectedMonth && (
        <div style={S.chartWrap}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip {...tooltipStyle} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#378ADD"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── Vue mensuelle ── */}
      {selectedMonth && transactionsByMonth.length > 0 && (
        <>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daylyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Jour", position: "insideBottomRight", offset: -5, fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: "Montant", angle: -90, position: "insideLeft", fontSize: 12 }}
                  tickFormatter={fmt}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [fmt(v), "Montant"]}
                />
                <Bar dataKey="total" fill="#378ADD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <MonthTable daylyData={daylyData} month={selectedMonth} />
        </>
      )}

      {/* ── Vue journalière ── */}
      {selectedDate && transactionsByDay.length > 0 && (
        <>
          <div style={S.chartWrap}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 12 }}
                  label={{ value: "Heure", position: "insideBottomRight", offset: -5, fontSize: 12 }}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  label={{ value: "Montant", angle: -90, position: "insideLeft", fontSize: 12 }}
                  tickFormatter={fmt}
                />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v) => [fmt(v), "Montant"]}
                />
                <Bar dataKey="total" fill="#378ADD" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DayTable transactions={transactionsByDay} date={selectedDate} />
        </>
      )}

      {/* ── État vide ── */}
      {selectedDate && transactionsByDay.length === 0 && (
        <p style={S.empty}>Aucune transaction trouvée pour le {selectedDate}.</p>
      )}

      {selectedMonth && transactionsByMonth.length === 0 && (
        <p style={S.empty}>Aucune transaction trouvée pour ce mois.</p>
      )}
    </div>
  );
};

export default TransactionChart;
