import React from 'react';
import { Users } from 'lucide-react';

// Penanganan: siapa yang memegang tiket. Pilihan PIC = anggota tim hasil routing + pengguna sendiri.
export default class AssignPanel extends React.Component {
  state = { pic: '', error: '' };
  assign = () => this.setState({ error: this.props.onAssign(this.state.pic) || '', pic: '' });

  render() {
    const { ticket: t, departmentName, members, user, canHandle } = this.props;
    const { pic, error } = this.state;
    const r = t.routing;
    const options = [...new Set([...members, user.name])].filter((n) => n !== t.assignee);
    const done = t.status === 'done' || !canHandle;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="assign-title">
        <h2 id="assign-title" className="flex items-center gap-2 text-lg font-bold text-slate-950"><Users className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />Assignment</h2>
        <dl className="mt-4 grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">Department</dt><dd className="mt-1 font-semibold text-slate-900">{departmentName}</dd></div>
          <div><dt className="text-xs text-slate-500">Team</dt><dd className="mt-1 font-semibold text-slate-900">{r ? r.team : '-'}</dd></div>
          <div><dt className="text-xs text-slate-500">PIC</dt><dd className="mt-1 font-semibold text-slate-900">{t.assignee || <span className="font-normal text-slate-500">{r && r.pic ? `Unassigned (initial: ${r.pic.name})` : 'Unassigned'}</span>}</dd></div>
        </dl>
        {!done && (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <label className="sr-only" htmlFor="pic-select">{t.assignee ? 'Change PIC' : 'Assign PIC'}</label>
            <select id="pic-select" value={pic} onChange={(e) => this.setState({ pic: e.target.value, error: '' })} className="min-h-[44px] flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]">
              <option value="">{t.assignee ? 'Change PIC…' : 'Assign to…'}</option>
              {options.map((n) => <option key={n} value={n}>{n}{n === user.name ? ' (saya)' : ''}</option>)}
            </select>
            <button type="button" onClick={this.assign} disabled={!pic} className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)] disabled:cursor-not-allowed disabled:opacity-50">{t.assignee ? 'Change PIC' : 'Assign'}</button>
          </div>
        )}
        {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </section>
    );
  }
}
