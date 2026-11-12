export type Result = {
  id: string;
  subject: string;
  score: number;
  maxScore: number;
  grade: string;
  teacher: string;
};

export type Fees = {
  totalBilled: number;
  amountPaid: number;
  dueDate: string;
  lastPaymentDate: string | null;
};

export type Child = {
  id: string;
  firstName: string;
  lastName: string;
  className: string;
  admissionNumber: string;
  currentTerm: string;
  results: Result[];
  fees: Fees | null;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  category: string;
  publishedAt: string;
};

export type ParentInfo = {
  firstName: string;
  lastName: string;
  relationship: string;
};

export type SchoolInfo = {
  name: string;
  shortName: string;
  currentTerm: string;
};

export type ParentDashboardData = {
  parent: ParentInfo;
  school: SchoolInfo;
  children: Child[];
  notices: Notice[];
};
