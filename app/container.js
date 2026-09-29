import LocalTicketRepository from '../data/TicketRepository';
import LocalCategoryRepository from '../data/CategoryRepository';
import seed from '../data/seed';
import { DEFAULT_CATEGORIES } from '../config/defaults';
import { ListTickets, ListCategories, ListLocations, CreateTicket, AdvanceTicket, GetStats } from '../domain/usecases';

// Composition root (dependency injection sederhana)
const tickets = new LocalTicketRepository(seed);
const categories = new LocalCategoryRepository(DEFAULT_CATEGORIES);
export const container = {
  listTickets: new ListTickets(tickets),
  listCategories: new ListCategories(categories),
  listLocations: new ListLocations(tickets),
  createTicket: new CreateTicket(tickets, categories),
  advanceTicket: new AdvanceTicket(tickets),
  getStats: new GetStats(tickets),
};
