import { PRIORITIES } from './constants';

export default class Ticket {
  constructor(p) { Object.assign(this, p); }
  static create({ location, priority, categoryId, title, description, reporter, hasPhoto }) {
    return new Ticket({
      id: `INC-${Math.floor(1000 + Math.random() * 9000)}`, location, priority, categoryId,
      title, description, reporter, hasPhoto: !!hasPhoto, status: 'open',
      assignee: null, createdAt: Date.now(),
    });
  }
  get slaMinutes() { return PRIORITIES[this.priority].sla; }
  remainingMin(now = Date.now()) { return this.slaMinutes - (now - this.createdAt) / 60000; }
  ageMin(now = Date.now()) { return (now - this.createdAt) / 60000; }
  isCritical(now) { return this.status !== 'done' && this.priority === 'P1' && this.remainingMin(now) < 30; }
  isBreached(now) { return this.status !== 'done' && this.remainingMin(now) < 0; }
}
