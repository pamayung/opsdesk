import React from 'react';
import { ChevronRight, Timer, MapPin, User, Clock, TrendingUp } from 'lucide-react';
import { AppContext } from '../../app/AppContext';
import { SLA_LEVELS, REQUEST_TYPES, LOCATION_KINDS, formatClock, formatDateTime } from '../../domain/constants';
import { canHandle } from '../../domain/Access';
import { PriorityBadge, StatusBadge, Button } from '../components/ui';
import AssignPanel from '../components/detail/AssignPanel';
import FieldNotes from '../components/detail/FieldNotes';
import ClosurePanel from '../components/detail/ClosurePanel';
import ResponseCard from '../components/detail/ResponseCard';

export default class TicketDetailPage extends React.Component {
  static contextType = AppContext;
  state = { now: Date.now() };
  componentDidMount() { this.timer = setInterval(() => this.setState({ now: Date.now() }), 1000); }
  componentWillUnmount() { clearInterval(this.timer); }

  // Jalankan use case. Sukses -> render ulang & (opsional) toast. Gagal -> kembalikan pesan error ke panel.
  attempt = (fn, okMessage) => {
    try { fn(); this.context.refresh(); if (okMessage) this.context.notify(okMessage); return null; }
    catch (err) { return err.message; }
  };
  get id() { return this.context.ticketId; }

  take = () => { const e = this.attempt(() => this.context.container.takeTicket.execute(this.id, this.context.user), `Tiket ${this.id} di-take.`); if (e) this.context.notify(e); };
  assign = (name) => this.attempt(() => this.context.container.assignPic.execute(this.id, name, this.context.user), `${name} set as PIC.`);
  sendNote = ({ text, image }) => this.attempt(() => this.context.container.addNote.execute(this.id, { actor: this.context.user, text, image }));
  close = ({ note }) => this.attempt(() => this.context.container.closeTicket.execute(this.id, { actor: this.context.user, note }), `Tiket ${this.id} resolved.`);
  escalate = ({ to }) => this.attempt(() => this.context.container.escalateTicket.execute(this.id, this.context.user, { to }), 'Tiket di-escalate.');

  renderMissing() {
    const { goTo } = this.context;
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-bold">Tiket tidak ditemukan</h1>
        <p className="mt-1 text-sm text-slate-600">Nomor {this.id} tidak ada di daftar. Mungkin sudah dihapus atau salah ketik.</p>
        <Button className="mt-5" onClick={() => goTo('tickets')}>Back to queue</Button>
      </div>
    );
  }

  render() {
    const { container, goTo, user } = this.context;
    const t = container.getTicket.execute(this.id, user);
    if (!t) return this.renderMissing();
    const { now } = this.state;
    const categories = container.listCategories.execute();
    const category = (categories.find((c) => c.id === t.categoryId) || {}).name || 'Umum';
    const kind = container.locationKind(t.branch);
    const sub = t.subId ? container.catalog.subOf(t.categoryId, t.subId) : null;
    const handle = canHandle(user, t);
    const level = t.slaLevel(now);
    const alert = level === 'critical' || level === 'breached';
    const sla = SLA_LEVELS[level];
    const esc = t.escalationLevel(now);
    const r = t.routing;
    const deptName = container.departments[t.department].name;

    return <div className="mx-auto max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-slate-600">
          <button type="button" onClick={() => goTo('tickets')} className="rounded font-medium hover:text-[var(--brand)] hover:underline">Tiket</button>
          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span>{category}</span>
          {sub && <><ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" /><span>{sub.name}</span></>}
          <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-900" aria-current="page">#{t.id}</span>
        </nav>
        <div className="inline-flex items-center gap-3 self-start rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-sm ring-1 ring-slate-200 sm:self-auto" role="timer" aria-label="SLA time remaining">
          <span className={`inline-flex items-center gap-2 ${sla.text}`}><span className={`h-2 w-2 rounded-full ${sla.dot} ${alert ? 'animate-pulse' : ''}`} />{sla.label}</span>
          {t.status === 'done'
            ? <span className="text-slate-600">Resolved {formatDateTime(t.resolution.closedAt, now)}</span>
            : <span className={`inline-flex items-center gap-1.5 tabular-nums ${alert ? 'text-red-700' : 'text-slate-700'}`}><Timer className="h-4 w-4" aria-hidden="true" />{formatClock(t.remainingMin(now))}</span>}
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <PriorityBadge priority={t.priority} /><StatusBadge status={t.status} />
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${REQUEST_TYPES[t.type].tone}`}>{REQUEST_TYPES[t.type].label}</span>
              {esc > 0 && <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-700">SLA Escalation L{esc}</span>}
              {t.escalation && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">Vendor escalation</span>}
              <span className="text-xs text-slate-500">ID: #{t.id}</span>
            </div>
            <h1 className="mt-3 break-words text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{t.title}</h1>
            {t.description && <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-slate-600">{t.description}</p>}
            {t.answers && t.answers.length > 0 && (
              <dl className="mt-3 grid max-w-2xl gap-x-6 gap-y-2 rounded-xl bg-slate-50 p-3 text-sm sm:grid-cols-2">
                {t.answers.map((a) => <div key={a.q} className="min-w-0"><dt className="text-xs text-slate-500">{a.q}</dt><dd className="break-words font-medium text-slate-900">{a.a}</dd></div>)}
              </dl>
            )}
            {esc > 0 && r && (
              <p className="mt-2 flex items-start gap-2 rounded-xl bg-orange-50 p-3 text-sm text-orange-900"><TrendingUp className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {esc === 1 ? `Belum di-respond melewati target ${t.respondTarget} min. Ditandai untuk team lead ${r.escalation.l1}.` : `SLA time left < 25%. Ditandai untuk ${r.escalation.l2} (department head).`}
              </p>
            )}
            {t.status === 'open' && handle && <Button className="mt-4" onClick={this.take}>Take Ticket</Button>}
          </div>
          <dl className="grid shrink-0 grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3 lg:w-[440px]">
            <div className="col-span-2 sm:col-span-1"><dt className="flex items-center gap-1.5 text-xs text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Lokasi</dt><dd className="mt-1 font-semibold text-slate-900">{t.branch || '-'}</dd><dd className="text-xs text-slate-500">{[container.locationPath(t.branch).split(' › ').slice(1).join(' › '), t.location].filter(Boolean).join(' · ')}{kind ? `${container.locationPath(t.branch).includes('›') || t.location ? ' · ' : ''}${LOCATION_KINDS[kind].label}` : ''}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-xs text-slate-500"><User className="h-3.5 w-3.5" aria-hidden="true" />Reporter</dt><dd className="mt-1 font-semibold text-slate-900">{t.reporter}{t.reporterRole ? ` (${t.reporterRole})` : ''}</dd></div>
            <div><dt className="flex items-center gap-1.5 text-xs text-slate-500"><Clock className="h-3.5 w-3.5" aria-hidden="true" />Created</dt><dd className="mt-1 font-semibold tabular-nums text-slate-900">{formatDateTime(t.createdAt, now)}</dd></div>
          </dl>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <AssignPanel ticket={t} departmentName={deptName} members={r ? container.membersOf(r.teamId) : []} user={user} canHandle={handle} onAssign={this.assign} />
          <FieldNotes ticket={t} onSend={this.sendNote} />
        </div>
        <div className="min-w-0 space-y-5">
          <ClosurePanel ticket={t} now={now} readOnly={!handle} onClose={this.close} onEscalate={this.escalate} />
          <ResponseCard ticket={t} now={now} />
        </div>
      </div>
    </div>;
  }
}
