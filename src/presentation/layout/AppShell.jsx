import React from 'react';
import { AppContext } from '../../app/AppContext';

const NAV = [['tickets', 'Tiket', '📋'], ['report', 'Lapor', '➕']];

export default class AppShell extends React.Component {
  static contextType = AppContext;
  render() {
    const { page, goTo, toast } = this.context;
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900" style={{ '--brand': '#065f46' }}>
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3">
            <span className="mr-auto text-lg font-bold text-[var(--brand)]">OpsDesk</span>
            <button onClick={() => goTo('report')} className="hidden min-h-[40px] rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 md:block">+ Buat tiket</button>
          </div>
        </header>

        <div className="mx-auto flex max-w-7xl">
          <nav className="hidden w-56 shrink-0 p-4 md:block" aria-label="Menu utama">
            {NAV.map(([k, l, i]) => (
              <button key={k} onClick={() => goTo(k)} aria-current={page === k}
                className={`mb-1 flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium ${page === k ? 'bg-[var(--brand)] text-white' : 'text-slate-700 hover:bg-slate-100'}`}>
                <span>{i}</span>{l}
              </button>
            ))}
          </nav>
          <main className="min-w-0 flex-1 p-4 pb-28 md:pb-8">{this.props.children}</main>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 border-t border-slate-200 bg-white md:hidden" aria-label="Menu utama">
          {NAV.map(([k, l, i]) => (
            <button key={k} onClick={() => goTo(k)} aria-current={page === k}
              className={`flex min-h-[56px] flex-col items-center justify-center text-xs font-medium ${page === k ? 'text-[var(--brand)]' : 'text-slate-500'}`}>
              <span className="text-lg">{i}</span>{l}
            </button>
          ))}
        </nav>

        {toast && <div role="status" className="fixed bottom-20 left-1/2 z-30 w-[90%] max-w-md -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm text-white shadow-lg md:bottom-6">{toast}</div>}
      </div>
    );
  }
}
