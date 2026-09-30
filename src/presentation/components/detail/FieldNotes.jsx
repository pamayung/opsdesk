import React from 'react';
import { MessagesSquare, Paperclip, Send, X } from 'lucide-react';
import { PARTIES, formatTime } from '../../../domain/constants';
import { readImage } from '../../utils/image';

const initials = (name) => { const w = name.trim().split(/\s+/); return (w.length > 1 ? w[0][0] + w[1][0] : name.slice(0, 2)).toUpperCase(); };

export default class FieldNotes extends React.Component {
  state = { text: '', image: null, error: '', busy: false };
  fileRef = React.createRef();
  componentDidMount() { this.mounted = true; }
  componentWillUnmount() { this.mounted = false; }

  onFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    this.setState({ busy: true, error: '' });
    try { const image = await readImage(file); if (this.mounted) this.setState({ image, busy: false }); }
    catch (err) { if (this.mounted) this.setState({ busy: false, error: err.message }); }
  };
  send = (e) => {
    e.preventDefault();
    const error = this.props.onSend({ text: this.state.text, image: this.state.image });
    this.setState(error ? { error } : { text: '', image: null, error: '' });
  };

  renderNote(n) {
    const time = formatTime(n.at);
    if (n.kind !== 'note') {
      return (
        <li key={n.id} className="relative flex items-center gap-3">
          <span className="relative z-10 grid w-10 shrink-0 place-items-center"><span className="h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white" /></span>
          <p className="min-w-0 flex-1 text-xs text-slate-500"><span className="tabular-nums">{time}</span> · {n.text}</p>
        </li>
      );
    }
    const p = PARTIES[n.party] || PARTIES.supervisor;
    return (
      <li key={n.id} className="relative flex items-start gap-3">
        <span className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-4 ring-white ${p.tone}`} aria-hidden="true">{initials(n.author)}</span>
        <div className="min-w-0 flex-1 rounded-xl bg-slate-50 p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">{n.author}{n.role ? ` (${n.role})` : ''}</p>
            <time className="shrink-0 text-xs tabular-nums text-slate-500">{time}</time>
          </div>
          {n.text && <p className="mt-1.5 whitespace-pre-line break-words text-sm leading-6 text-slate-700">{n.text}</p>}
          {n.image && <img src={n.image} alt={`Attachment dari ${n.author}`} loading="lazy" className="mt-3 max-h-64 w-full max-w-sm rounded-lg object-cover" />}
        </div>
      </li>
    );
  }

  render() {
    const { ticket: t } = this.props;
    const { text, image, error, busy } = this.state;
    const humanCount = t.notes.filter((n) => n.kind === 'note').length;
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="notes-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="notes-title" className="flex items-center gap-2 text-lg font-bold text-slate-950"><MessagesSquare className="h-5 w-5 text-[var(--brand)]" aria-hidden="true" />Catatan &amp; riwayat</h2>
          <span className="shrink-0 text-xs font-semibold text-slate-500">{humanCount} catatan</span>
        </div>
        {t.notes.length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Belum ada catatan. Tulis update pertama di bawah.</p>}
        <ol className="relative mt-5 space-y-4 before:absolute before:bottom-3 before:left-5 before:top-3 before:w-px before:bg-slate-200">
          {t.notes.map((n) => this.renderNote(n))}
        </ol>

        {t.status === 'done' ? (
          <p className="mt-5 rounded-xl bg-slate-50 p-3 text-center text-sm text-slate-500">Tiket sudah resolved. Catatan tidak bisa ditambah lagi.</p>
        ) : (
          <form onSubmit={this.send} className="mt-5 border-t border-slate-100 pt-4">
            {image && (
              <div className="mb-3 inline-flex items-center gap-2 rounded-xl bg-slate-50 p-2 pr-3">
                <img src={image} alt="Preview foto yang akan dikirim" className="h-12 w-12 rounded-lg object-cover" />
                <span className="text-xs text-slate-600">Foto siap dikirim</span>
                <button type="button" onClick={() => this.setState({ image: null })} aria-label="Hapus foto" className="grid h-7 w-7 place-items-center rounded-full text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" aria-hidden="true" /></button>
              </div>
            )}
            <div className="flex items-center gap-2">
              <label htmlFor="note-input" className="sr-only">Instruksi atau update cepat</label>
              <input id="note-input" value={text} maxLength={500} onChange={(e) => this.setState({ text: e.target.value, error: '' })} placeholder="Tulis instruksi atau update cepat…" className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--brand)]" />
              <button type="button" onClick={() => this.fileRef.current.click()} disabled={busy} aria-label="Attach foto" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50"><Paperclip className="h-[18px] w-[18px]" aria-hidden="true" /></button>
              <input ref={this.fileRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={this.onFile} />
              <button type="submit" disabled={busy || (!text.trim() && !image)} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl bg-[var(--brand)] px-4 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">Kirim<Send className="h-4 w-4" aria-hidden="true" /></button>
            </div>
            {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
          </form>
        )}
      </section>
    );
  }
}
