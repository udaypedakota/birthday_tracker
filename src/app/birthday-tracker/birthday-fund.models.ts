export interface BirthdayEvent {
  id: string;
  employeeId: string;
  employeeName: string;
  birthDate: string;
  celebrationDate: string;
  notes?: string;
  avatar?: string;
}

export interface Contribution {
  id: string;
  eventId: string;
  contributorId: string;
  contributorName: string;
  amount: number;
  paidOn: string;          // 'YYYY-MM-DD'
  status: 'paid' | 'pending';
}

export interface Expense {
  id: string;
  eventId: string;
  category: 'cake' | 'gift' | 'snacks' | 'decoration' | 'other';
  description: string;
  amount: number;
  date: string;            // 'YYYY-MM-DD'
}

export interface EventSummary {
  event: BirthdayEvent;
  totalCollected: number;
  totalExpense: number;
  balance: number;
  carryForward: number;    // balance brought from previous event
  netTotal: number;        // carryForward + totalCollected
  netBalance: number;      // netTotal - totalExpense
  contributions: Contribution[];
  expenses: Expense[];
  pendingContributors: Contribution[];
}
