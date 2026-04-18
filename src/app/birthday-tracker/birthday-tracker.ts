import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BirthdayFundService } from './birthday-fund.service';
import { BirthdayEvent, Contribution, Expense, EventSummary } from './birthday-fund.models';

type Tab = 'calendar' | 'events' | 'collections' | 'expenses' | 'reports';

export interface CalendarDay {
  date: Date | null;
  day: number;
  isToday: boolean;
  isCurrentMonth: boolean;
  birthdays: BirthdayEvent[];
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
}

const EMPLOYEES: Employee[] = [];

@Component({
  selector: 'app-birthday-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './birthday-tracker.html',
  styleUrl: './birthday-tracker.css',
})
export class BirthdayTrackerComponent implements OnInit, OnDestroy {
  constructor(public svc: BirthdayFundService, public router: Router) {}

  today = '';
  currentTime = '';
  private timer: any;

  private updateDateTime() {
    const now = new Date();
    this.today = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    this.currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  activeTab: Tab = (localStorage.getItem('bt_tab') as Tab) || 'collections';

  get isAdmin(): boolean {
    return localStorage.getItem('userRole') === 'admin';
  }

  // employees derived from events so IDs always match
  get employees(): Employee[] {
    return this.events.map(e => ({ id: e.employeeId, name: e.employeeName, role: '', department: '' }));
  }

  // ── Events ──────────────────────────────────────────
  events: BirthdayEvent[] = [];
  showEventModal = false;
  showEditModal = false;
  editEvent: Partial<BirthdayEvent> & { id?: string } = {};
  newEvent: Partial<BirthdayEvent> = {};

  // ── Selected Event ──────────────────────────────────
  selectedEventId = localStorage.getItem('bt_eventId') || '';
  get selectedSummary(): EventSummary | null {
    if (!this.selectedEventId) return null;
    return this.summaries.find(s => s.event.id === this.selectedEventId) ?? null;
  }

  // ── Contributions ────────────────────────────────────
  showContribModal = false;
  newContrib: Partial<Contribution> = {};
  fixedAmount = 30;

  get allEmployeeRows() {
    if (!this.selectedEventId) return [];
    const event = this.events.find(e => e.id === this.selectedEventId);
    const contribs = this.svc.getContributionsByEvent(this.selectedEventId);
    return this.employees
      .filter(e => e.id !== event?.employeeId)
      .map(e => {
        const found = contribs.find(c => c.contributorId === e.id);
        return { employee: e, contribution: found ?? null };
      });
  }

  get paidCount() { return this.allEmployeeRows.filter(r => r.contribution?.status === 'paid').length; }
  get pendingCount() { return this.allEmployeeRows.filter(r => !r.contribution || r.contribution.status === 'pending').length; }
  get totalCollectedDisplay() {
    return this.allEmployeeRows
      .filter(r => r.contribution?.status === 'paid')
      .reduce((s, r) => s + (r.contribution?.amount ?? 0), 0);
  }
  get carryForwardDisplay() { return this.selectedSummary?.carryForward ?? 0; }
  get netTotalDisplay() { return this.carryForwardDisplay + this.totalCollectedDisplay; }
  get netBalanceDisplay() { return this.netTotalDisplay - (this.selectedSummary?.totalExpense ?? 0); }

  // ── Expenses ─────────────────────────────────────────
  showExpenseModal = false;
  newExpense: Partial<Expense> = {};
  expenseCategories = ['cake', 'gift', 'snacks', 'decoration', 'other'];

  // ── Reports ──────────────────────────────────────────
  summaries: EventSummary[] = [];
  reportMonth = '';

  get filteredSummaries(): EventSummary[] {
    const today = new Date().toISOString().slice(0, 10);
    const past = this.summaries.filter(s => s.event.celebrationDate <= today);
    if (!this.reportMonth) return past;
    return past.filter(s => s.event.celebrationDate.startsWith(this.reportMonth));
  }

  get reportTotals() {
    const list = this.filteredSummaries;
    return {
      collected: list.reduce((s, x) => s + x.totalCollected, 0),
      expense: list.reduce((s, x) => s + x.totalExpense, 0),
      balance: list.reduce((s, x) => s + x.balance, 0),
    };
  }

  // ── Delete confirm ───────────────────────────────────
  showDeleteModal = false;
  deleteType: 'event' | 'contribution' | 'expense' = 'event';
  deleteTargetId = '';
  deleteTargetLabel = '';

  ngOnInit() {
    this.updateDateTime();
    this.timer = setInterval(() => this.updateDateTime(), 1000);
    this.svc.load().subscribe(() => this.refresh());
  }

  ngOnDestroy() { clearInterval(this.timer); }

  refresh() {
    this.events = this.svc.getEvents();
    this.summaries = this.svc.getAllSummaries();
  }

  setTab(tab: Tab) {
    this.activeTab = tab; localStorage.setItem('bt_tab', tab);
    if (tab === 'reports') this.refresh();
    if (tab === 'expenses' && !this.selectedEventId && this.completedEvents.length > 0) {
      this.selectedEventId = this.completedEvents[0].id;
    }
    if (tab === 'calendar') this.selectedDayEvents = [];
  }

  selectEvent(id: string) {
    this.selectedEventId = id;
    localStorage.setItem('bt_eventId', id);
    this.activeTab = 'collections';
    localStorage.setItem('bt_tab', 'collections');
  }

  onEventSelect(id: string) {
    localStorage.setItem('bt_eventId', id);
  }

  // ── Event CRUD ───────────────────────────────────────
  openEventModal() { this.newEvent = {}; this.showEventModal = true; }

  saveEvent() {
    const e = this.newEvent;
    if (!e.employeeId || !e.celebrationDate) return;
    const emp = this.employees.find(x => x.id === e.employeeId);
    this.svc.addEvent({
      employeeId: e.employeeId!,
      employeeName: emp?.name || e.employeeId!,
      birthDate: e.birthDate || '',
      celebrationDate: e.celebrationDate!,
      notes: e.notes,
    });
    this.showEventModal = false;
    this.refresh();
  }

  openEditModal(e: BirthdayEvent) { this.editEvent = { ...e }; this.showEditModal = true; }

  saveEditEvent() {
    const e = this.editEvent;
    if (!e.id || !e.celebrationDate) return;
    this.svc.updateEvent(e.id, { birthDate: e.birthDate, celebrationDate: e.celebrationDate, notes: e.notes });
    this.showEditModal = false;
    this.refresh();
  }

  // ── Contribution CRUD ────────────────────────────────

  openContribModal() {
    this.newContrib = { eventId: this.selectedEventId, status: 'paid', paidOn: today() };
    this.showContribModal = true;
  }

  saveContrib() {
    const c = this.newContrib;
    if (!c.contributorName || !c.amount || !c.eventId) return;
    this.svc.addContribution({
      eventId: c.eventId!,
      contributorId: c.contributorId || '',
      contributorName: c.contributorName!,
      amount: +c.amount,
      paidOn: c.paidOn || today(),
      status: c.status as 'paid' | 'pending',
    });
    this.showContribModal = false;
    this.refresh();
  }

  private lastClick = 0;

  markEmployeePaid(employeeId: string, employeeName: string, status: 'paid' | 'pending') {
    const now = Date.now();
    if (now - this.lastClick < 500) return;
    this.lastClick = now;
    const contribs = this.svc.getContributionsByEvent(this.selectedEventId);
    const existing = contribs.find(c => c.contributorId === employeeId);
    const save$ = existing
      ? this.svc.updateContributionStatus(existing.id, status, this.fixedAmount)
      : status === 'paid'
        ? this.svc.addContribution({
            eventId: this.selectedEventId,
            contributorId: employeeId,
            contributorName: employeeName,
            amount: this.fixedAmount,
            paidOn: today(),
            status: 'paid',
          })
        : null;
    if (save$) {
      save$.subscribe(() => this.svc.load().subscribe(() => this.refresh()));
    }
  }

  // ── Expense CRUD ─────────────────────────────────────
  openExpenseModal() {
    this.newExpense = { eventId: this.selectedEventId, date: today(), category: 'cake' };
    this.showExpenseModal = true;
  }

  saveExpense() {
    const x = this.newExpense;
    if (!x.description || !x.amount || !x.eventId) return;
    this.svc.addExpense({
      eventId: x.eventId!,
      category: x.category as Expense['category'],
      description: x.description!,
      amount: +x.amount,
      date: x.date || today(),
    });
    this.showExpenseModal = false;
    this.refresh();
  }

  // ── Delete ───────────────────────────────────────────
  askDelete(type: 'event' | 'contribution' | 'expense', id: string, label: string) {
    this.deleteType = type;
    this.deleteTargetId = id;
    this.deleteTargetLabel = label;
    this.showDeleteModal = true;
  }

  confirmDelete() {
    if (this.deleteType === 'event') this.svc.deleteEvent(this.deleteTargetId);
    if (this.deleteType === 'contribution') this.svc.deleteContribution(this.deleteTargetId);
    if (this.deleteType === 'expense') this.svc.deleteExpense(this.deleteTargetId);
    this.showDeleteModal = false;
    if (this.deleteType === 'event' && this.selectedEventId === this.deleteTargetId) {
      this.selectedEventId = '';
      localStorage.removeItem('bt_eventId');
    }
    this.refresh();
  }


  get sortedEvents(): BirthdayEvent[] {
    const now = new Date();
    const todayMMDD = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const mmdd = (e: BirthdayEvent) => (e.birthDate || e.celebrationDate).slice(5);
    return [...this.events].sort((a, b) => {
      const aToday = mmdd(a) === todayMMDD;
      const bToday = mmdd(b) === todayMMDD;
      if (aToday && !bToday) return -1;
      if (!aToday && bToday) return 1;
      return mmdd(a).localeCompare(mmdd(b));
    });
  }

  get todayBirthdayEvents(): BirthdayEvent[] {
    const now = new Date();
    const todayMMDD = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    return this.events.filter(e => (e.birthDate || e.celebrationDate).slice(5) === todayMMDD);
  }

  confetti = Array.from({ length: 40 }, (_, i) => i);
  balloons = Array.from({ length: 6 }, (_, i) => i);

  // ── Calendar ─────────────────────────────────────────
  calendarDate = new Date();
  selectedDayEvents: BirthdayEvent[] = [];
  selectedDayLabel = '';
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  get calendarTitle(): string {
    return this.calendarDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  get calendarDays(): CalendarDay[] {
    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    const days: CalendarDay[] = [];
    // leading empty cells
    for (let i = 0; i < firstDay; i++) days.push({ date: null, day: 0, isToday: false, isCurrentMonth: false, birthdays: [] });
    // actual days
    for (let d = 1; d <= daysInMonth; d++) {
      const mmdd = `${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const birthdays = this.events.filter(e => (e.birthDate || e.celebrationDate).slice(5) === mmdd);
      days.push({
        date: new Date(year, month, d),
        day: d,
        isToday: mmdd === todayStr,
        isCurrentMonth: true,
        birthdays,
      });
    }
    return days;
  }

  prevMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    this.selectedDayEvents = [];
  }

  nextMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    this.selectedDayEvents = [];
  }

  goToToday() {
    this.calendarDate = new Date();
    this.selectedDayEvents = [];
  }

  selectDay(day: CalendarDay) {
    if (!day.date || day.birthdays.length === 0) { this.selectedDayEvents = []; return; }
    this.selectedDayEvents = day.birthdays;
    this.selectedDayLabel = day.date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  isToday(dateStr: string): boolean {
    const today = new Date();
    const mmdd = `${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    return (dateStr || '').slice(5) === mmdd;
  }

  showQRModal = false;
  activeQRImage = '';
  activeQRName = '';

  openQR(image: string, name: string) {
    this.activeQRImage = image;
    this.activeQRName = name;
    this.showQRModal = true;
  }

  get completedEvents() {
    const today = new Date().toISOString().slice(0, 10);
    return this.events
      .filter(e => e.celebrationDate <= today)
      .sort((a, b) => b.celebrationDate.localeCompare(a.celebrationDate));
  }

  get upcomingEvents() {
    const today = new Date().toISOString().slice(0, 10);
    return this.events
      .filter(e => e.celebrationDate > today)
      .sort((a, b) => a.celebrationDate.localeCompare(b.celebrationDate));
  }

  exportCSV() {
    const year = new Date().getFullYear();
    const allSummaries = this.svc.getAllSummaries();
    const rows: any[][] = [
      ['Birthday Celebration Tracker — Detailed Report'],
      ['Generated on', new Date().toLocaleDateString('en-IN')],
      [''],
    ];

    allSummaries.forEach(s => {
      const contribs = s.contributions;
      const paid   = contribs.filter(c => c.status === 'paid');
      const pending = contribs.filter(c => c.status === 'pending');

      // Event header
      rows.push([`🎂 ${s.event.employeeName} — Birthday: ${s.event.birthDate} | Celebration: ${s.event.celebrationDate}`]);
      rows.push(['Total Members', contribs.length, 'Paid', paid.length, 'Pending', pending.length]);
      rows.push(['Collected (₹)', s.totalCollected, 'Expense (₹)', s.totalExpense, 'Balance (₹)', s.netBalance]);
      rows.push(['']);

      if (contribs.length > 0) {
        rows.push(['#', 'Contributor Name', 'Amount (₹)', 'Status', 'Paid On']);
        contribs.forEach((c, i) => {
          rows.push([i + 1, c.contributorName, c.amount, c.status === 'paid' ? 'Paid' : 'Pending', c.status === 'paid' ? c.paidOn : '—']);
        });
      } else {
        rows.push(['No contributions recorded yet.']);
      }

      if (s.expenses.length > 0) {
        rows.push(['']);
        rows.push(['Expenses:']);
        rows.push(['#', 'Category', 'Description', 'Amount (₹)', 'Date']);
        s.expenses.forEach((x, i) => {
          rows.push([i + 1, x.category, x.description, x.amount, x.date]);
        });
      }

      rows.push(['', '', '', '', '', '']);
      rows.push(['--- --- --- --- ---']);
      rows.push(['']);
    });

    // Grand total
    rows.push(['GRAND TOTAL']);
    rows.push(['Total Events', allSummaries.length]);
    rows.push(['Total Collected (₹)', allSummaries.reduce((a, s) => a + s.totalCollected, 0)]);
    rows.push(['Total Expense (₹)',   allSummaries.reduce((a, s) => a + s.totalExpense, 0)]);
    rows.push(['Net Balance (₹)',     allSummaries.reduce((a, s) => a + s.netBalance, 0)]);

    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `birthday-tracker-${year}.csv`;
    a.click();
  }

  isPast(dateStr: string): boolean {
    return new Date(dateStr) < new Date(new Date().toDateString());
  }

  categoryIcon(cat: string): string {
    return ({ cake: '🎂', gift: '🎁', snacks: '🍿', decoration: '🎊', other: '💰' } as any)[cat] || '💰';
  }

  get chartData() {
    const list = this.filteredSummaries;
    const maxVal = Math.max(...list.map(s => Math.max(s.totalCollected, s.totalExpense)), 1);
    const barH = 180;
    return list.map(s => ({
      name: s.event.employeeName.split(' ').slice(-1)[0],
      fullName: s.event.employeeName,
      date: s.event.celebrationDate,
      collected: s.totalCollected,
      expense: s.totalExpense,
      balance: s.netBalance,
      collectedH: Math.round((s.totalCollected / maxVal) * barH),
      expenseH: Math.round((s.totalExpense / maxVal) * barH),
      categories: this.expenseCategories
        .map(c => ({ cat: c, amt: s.expenses.filter(x => x.category === c).reduce((a, b) => a + b.amount, 0) }))
        .filter(x => x.amt > 0),
      totalExpense: s.totalExpense,
    }));
  }

  catColor(cat: string): string {
    return ({ cake: '#f59e0b', gift: '#3b82f6', snacks: '#22c55e', decoration: '#a855f7', other: '#64748b' } as any)[cat] || '#64748b';
  }
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
