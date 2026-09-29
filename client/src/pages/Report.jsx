import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, ErrorBox } from '../components/Feedback';
import { Logo, IconPrinter, IconChevronLeft, IconChevronRight } from '../components/Icons';
import { formatMoney, formatDate, monthLabel, currentMonth, shiftMonth, todayISO } from '../utils/format';

function Delta({ current, previous, invert = false }) {
  if (!previous) return <span className="text-xs text-faint">—</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const good = invert ? pct <= 0 : pct >= 0;
  return (
    <span className={`text-xs font-semibold ${good ? 'text-accent' : 'text-danger'}`}>
      {pct >= 0 ? '▲' : '▼'} {Math.abs(pct)}% vs mois précédent
    </span>
  );
}

function ReportSection({ title, children }) {
  return (
    <section className="mt-6" style={{ breakInside: 'avoid' }}>
      <h3 className="mb-3 border-b-2 border-line/10 pb-2 text-sm font-bold uppercase tracking-wide text-mute">
        {title}
      </h3>
      {children}
    </section>
  );
}

export default function Report() {
  const { user } = useAuth();
  const currency = user?.currency || 'EUR';

  const [month, setMonth] = useState(currentMonth());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await api.get(`/api/stats/monthly-report?month=${month}`);
      setReport(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const net = report ? report.totals.income - report.totals.expense : 0;
  const savingsRate = report && report.totals.income > 0
    ? Math.round((net / report.totals.income) * 100)
    : null;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Barre d'outils (non imprimée) */}
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-strong">Rapport mensuel</h1>
          <p className="text-sm text-faint">
            Synthèse imprimable de votre mois — exportable en PDF via la fonction d'impression.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary !px-3" onClick={() => setMonth((m) => shiftMonth(m, -1))} aria-label="Mois précédent">
            <IconChevronLeft />
          </button>
          <span className="min-w-40 text-center text-sm font-semibold text-strong">
            {monthLabel(month)}
          </span>
          <button
            className="btn-secondary !px-3"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= currentMonth()}
            aria-label="Mois suivant"
          >
            <IconChevronRight />
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <IconPrinter /> Imprimer / PDF
          </button>
        </div>
      </div>

      {loading ? (
        <Spinner label="Génération du rapport…" />
      ) : error ? (
        <ErrorBox message={error} onRetry={load} />
      ) : report ? (
        /* ---------- Document imprimable ---------- */
        <div className="card mx-auto max-w-3xl p-8 sm:p-10 print:!p-0 print:!shadow-none print:!ring-0">
          {/* En-tête */}
          <header className="flex items-start justify-between border-b-2 border-line/10 pb-5">
            <div className="flex items-center gap-3">
              <Logo size={44} />
              <div>
                <p className="text-lg font-bold text-strong">MonBudget</p>
                <p className="text-xs text-faint">Rapport mensuel — {monthLabel(report.month)}</p>
              </div>
            </div>
            <div className="text-right text-xs text-faint">
              <p className="font-semibold text-strong">{user?.name}</p>
              <p>Généré le {formatDate(todayISO())}</p>
            </div>
          </header>

          {/* Synthèse */}
          <ReportSection title="Synthèse du mois">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-raised/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-faint">Revenus</p>
                <p className="mt-1 font-bold text-accent">{formatMoney(report.totals.income, currency)}</p>
                <Delta current={report.totals.income} previous={report.prev.income} />
              </div>
              <div className="rounded-xl bg-raised/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-faint">Dépenses</p>
                <p className="mt-1 font-bold text-danger">{formatMoney(report.totals.expense, currency)}</p>
                <Delta current={report.totals.expense} previous={report.prev.expense} invert />
              </div>
              <div className="rounded-xl bg-raised/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-faint">Solde du mois</p>
                <p className={`mt-1 font-bold ${net >= 0 ? 'text-strong' : 'text-danger'}`}>
                  {formatMoney(net, currency, { sign: net < 0 })}
                </p>
                <span className="text-xs text-faint">
                  {savingsRate !== null ? `taux d'épargne : ${savingsRate}%` : `${report.totals.count} opération(s)`}
                </span>
              </div>
              <div className="rounded-xl bg-raised/60 p-3.5">
                <p className="text-[11px] uppercase tracking-wide text-faint">Solde cumulé fin de mois</p>
                <p className={`mt-1 font-bold ${report.balanceAtEnd >= 0 ? 'text-strong' : 'text-danger'}`}>
                  {formatMoney(report.balanceAtEnd, currency, { sign: report.balanceAtEnd < 0 })}
                </p>
                <span className="text-xs text-faint">toutes opérations</span>
              </div>
            </div>
          </ReportSection>

          {/* Dépenses par catégorie */}
          <ReportSection title={`Dépenses par catégorie (${report.expenses.length})`}>
            {report.expenses.length === 0 ? (
              <p className="text-sm text-faint">Aucune dépense ce mois-ci.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line/10 text-left text-xs uppercase tracking-wide text-faint">
                    <th className="py-2 font-medium">Catégorie</th>
                    <th className="py-2 text-center font-medium">Opérations</th>
                    <th className="py-2 text-right font-medium">Montant</th>
                    <th className="py-2 text-right font-medium">Part</th>
                  </tr>
                </thead>
                <tbody>
                  {report.expenses.map((c) => {
                    const pct = report.totals.expense > 0 ? Math.round((c.total / report.totals.expense) * 100) : 0;
                    return (
                      <tr key={c.name} className="border-b border-line/5 last:border-0">
                        <td className="py-2.5">
                          <span className="mr-2">{c.icon}</span>
                          <span className="font-medium text-strong">{c.name}</span>
                        </td>
                        <td className="py-2.5 text-center text-mute">{c.count}</td>
                        <td className="py-2.5 text-right font-semibold text-strong">
                          {formatMoney(c.total, currency)}
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-raised">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                            </div>
                            <span className="w-9 text-right text-xs text-faint">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </ReportSection>

          {/* Revenus par catégorie */}
          {report.incomes.length > 0 && (
            <ReportSection title="Revenus par catégorie">
              <table className="w-full text-sm">
                <tbody>
                  {report.incomes.map((c) => (
                    <tr key={c.name} className="border-b border-line/5 last:border-0">
                      <td className="py-2.5">
                        <span className="mr-2">{c.icon}</span>
                        <span className="font-medium text-strong">{c.name}</span>
                      </td>
                      <td className="py-2.5 text-center text-mute">{c.count} opération(s)</td>
                      <td className="py-2.5 text-right font-semibold text-accent">
                        +{formatMoney(c.total, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ReportSection>
          )}

          {/* Plus grosses dépenses */}
          {report.topExpenses.length > 0 && (
            <ReportSection title="5 principales dépenses">
              <ul className="space-y-2">
                {report.topExpenses.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-strong">
                      <span className="mr-2 text-faint">{i + 1}.</span>
                      {t.categoryIcon} {t.description || t.categoryName || 'Sans description'}
                      <span className="ml-2 text-xs text-faint">{formatDate(t.date)}</span>
                    </span>
                    <span className="font-semibold text-danger">−{formatMoney(t.amount, currency)}</span>
                  </li>
                ))}
              </ul>
            </ReportSection>
          )}

          <footer className="mt-8 border-t border-line/10 pt-4 text-center text-[11px] text-faint">
            Document généré automatiquement par MonBudget · {monthLabel(report.month)} · {user?.name}
          </footer>
        </div>
      ) : null}
    </div>
  );
}
