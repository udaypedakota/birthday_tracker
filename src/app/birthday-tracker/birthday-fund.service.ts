import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, tap, catchError, of } from 'rxjs';
import { BirthdayEvent, Contribution, Expense, EventSummary } from './birthday-fund.models';

const API = window.location.hostname === 'localhost' ? 'http://localhost:3000/api' : 'https://birthday-tracker-szmx.onrender.com/api';

@Injectable({ providedIn: 'root' })
export class BirthdayFundService {

  private events: BirthdayEvent[] = [];
  private contributions: Contribution[] = [];
  private expenses: Expense[] = [];

  constructor(private http: HttpClient) {}

  private uid(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  load(): Observable<any> {
    return forkJoin({
      events:        this.http.get<BirthdayEvent[]>(`${API}/events`).pipe(catchError(() => this.http.get<BirthdayEvent[]>('assets/data/events.json'))),
      contributions: this.http.get<Contribution[]>(`${API}/contributions`).pipe(catchError(() => this.http.get<Contribution[]>('assets/data/contributions.json'))),
      expenses:      this.http.get<Expense[]>(`${API}/expenses`).pipe(catchError(() => this.http.get<Expense[]>('assets/data/expenses.json'))),
    }).pipe(tap(data => {
      this.events        = data.events;
      this.contributions = data.contributions;
      this.expenses      = data.expenses;
    }));
  }

  // ── Events ──────────────────────────────────────────
  getEvents(): BirthdayEvent[] { return this.events; }

  addEvent(e: Omit<BirthdayEvent, 'id'>): BirthdayEvent {
    const newEvent = { ...e, id: this.uid() };
    this.events = [...this.events, newEvent];
    this.http.post(`${API}/events`, newEvent).pipe(catchError(() => of(null))).subscribe();
    return newEvent;
  }

  updateEvent(id: string, patch: Partial<BirthdayEvent>): void {
    this.events = this.events.map(e => e.id === id ? { ...e, ...patch } : e);
    this.http.put(`${API}/events/${id}`, patch).pipe(catchError(() => of(null))).subscribe();
  }

  deleteEvent(id: string): void {
    this.events        = this.events.filter(e => e.id !== id);
    this.contributions = this.contributions.filter(c => c.eventId !== id);
    this.expenses      = this.expenses.filter(x => x.eventId !== id);
    this.http.delete(`${API}/events/${id}`).pipe(catchError(() => of(null))).subscribe();
  }

  // ── Contributions ────────────────────────────────────
  getContributions(): Contribution[] { return this.contributions; }

  getContributionsByEvent(eventId: string): Contribution[] {
    return this.contributions.filter(c => c.eventId === eventId);
  }

  addContribution(c: Omit<Contribution, 'id'>): Observable<any> {
    const newC = { ...c, id: this.uid() };
    this.contributions = [...this.contributions, newC];
    return this.http.post(`${API}/contributions`, newC).pipe(catchError(() => of(null)));
  }

  updateContributionStatus(id: string, status: 'paid' | 'pending', amount?: number): Observable<any> {
    const updated = this.contributions.map(c => {
      if (c.id !== id) return c;
      return { ...c, status, amount: amount ?? c.amount, paidOn: status === 'paid' ? new Date().toISOString().slice(0, 10) : c.paidOn };
    });
    this.contributions = updated;
    const item = updated.find(c => c.id === id)!;
    return this.http.put(`${API}/contributions/${id}`, item).pipe(catchError(() => of(null)));
  }

  deleteContribution(id: string): void {
    this.contributions = this.contributions.filter(c => c.id !== id);
    this.http.delete(`${API}/contributions/${id}`).pipe(catchError(() => of(null))).subscribe();
  }

  // ── Expenses ─────────────────────────────────────────
  getExpenses(): Expense[] { return this.expenses; }

  getExpensesByEvent(eventId: string): Expense[] {
    return this.expenses.filter(x => x.eventId === eventId);
  }

  addExpense(x: Omit<Expense, 'id'>): void {
    const newX = { ...x, id: this.uid() };
    this.expenses = [...this.expenses, newX];
    this.http.post(`${API}/expenses`, newX).pipe(catchError(() => of(null))).subscribe();
  }

  deleteExpense(id: string): void {
    this.expenses = this.expenses.filter(x => x.id !== id);
    this.http.delete(`${API}/expenses/${id}`).pipe(catchError(() => of(null))).subscribe();
  }

  // ── Summary ──────────────────────────────────────────
  getSummary(eventId: string, carryForward = 0): EventSummary {
    const event = this.events.find(e => e.id === eventId)!;
    const contributions = this.getContributionsByEvent(eventId);
    const expenses = this.getExpensesByEvent(eventId);
    const totalCollected = contributions.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
    const totalExpense = expenses.reduce((s, x) => s + x.amount, 0);
    const netTotal = carryForward + totalCollected;
    const netBalance = netTotal - totalExpense;
    return {
      event, totalCollected, totalExpense,
      balance: totalCollected - totalExpense,
      carryForward, netTotal, netBalance,
      contributions, expenses,
      pendingContributors: contributions.filter(c => c.status === 'pending'),
    };
  }

  getAllSummaries(): EventSummary[] {
    const sorted = [...this.events].sort((a, b) => a.celebrationDate.localeCompare(b.celebrationDate));
    let runningBalance = 0;
    return sorted.map(e => {
      const summary = this.getSummary(e.id, runningBalance);
      runningBalance = summary.netBalance;
      return summary;
    });
  }
}
