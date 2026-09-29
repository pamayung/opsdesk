import React from 'react';
import { AppContext } from './app/AppContext';
import { container } from './app/container';
import AppShell from './presentation/layout/AppShell';
import TicketListPage from './presentation/pages/TicketListPage';
import QuickIncidentPage from './presentation/pages/QuickIncidentPage';

export default class App extends React.Component {
  state = { page: 'tickets', toast: '' };

  goTo = (page) => this.setState({ page });
  notify = (toast) => { this.setState({ toast }); clearTimeout(this.tt); this.tt = setTimeout(() => this.setState({ toast: '' }), 4000); };
  componentWillUnmount() { clearTimeout(this.tt); }

  render() {
    const { page, toast } = this.state;
    const value = { container, page, toast, actor: 'Petugas', goTo: this.goTo, notify: this.notify };
    return (
      <AppContext.Provider value={value}>
        <AppShell>{page === 'tickets' ? <TicketListPage /> : <QuickIncidentPage />}</AppShell>
      </AppContext.Provider>
    );
  }
}
