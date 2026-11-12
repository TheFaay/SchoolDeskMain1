/**
 * Sample data that stays behind while the shared database has no results or
 * notices tables. Children and fees now come from the database in data.ts.
 *
 * The result sets are kept in the same order as the sample children. They are
 * only used as placeholder results until a results table exists.
 */

export const parent = {
  firstName: "Adaeze",
  lastName: "Okafor",
  relationship: "Parent / Guardian",
};

export const children = [
  {
    id: "child-chidera",
    firstName: "Chidera",
    lastName: "Okafor",
    className: "JSS 2A",
    admissionNumber: "CHA-2023-014",
    house: "Ruby House",
    currentTerm: "Term 1 · 2026/2027",
    results: [
      {
        id: "chidera-mathematics",
        subject: "Mathematics",
        score: 86,
        maxScore: 100,
        grade: "A",
        teacher: "Mrs. Bello",
      },
      {
        id: "chidera-english",
        subject: "English Language",
        score: 78,
        maxScore: 100,
        grade: "B",
        teacher: "Ms. Adeyemi",
      },
      {
        id: "chidera-basic-science",
        subject: "Basic Science",
        score: 91,
        maxScore: 100,
        grade: "A",
        teacher: "Mr. Eze",
      },
      {
        id: "chidera-social-studies",
        subject: "Social Studies",
        score: 74,
        maxScore: 100,
        grade: "B",
        teacher: "Mrs. Lawal",
      },
      {
        id: "chidera-computer",
        subject: "Computer Studies",
        score: 88,
        maxScore: 100,
        grade: "A",
        teacher: "Mr. Okafor",
      },
      {
        id: "chidera-french",
        subject: "French",
        score: 69,
        maxScore: 100,
        grade: "C",
        teacher: "Mme. Diallo",
      },
    ],
    fees: {
      totalBilled: 185_000,
      amountPaid: 135_000,
      dueDate: "2026-11-15",
      lastPaymentDate: "2026-10-12",
    },
  },
  {
    id: "child-somtochukwu",
    firstName: "Somtochukwu",
    lastName: "Okafor",
    className: "JSS 3B",
    admissionNumber: "CHA-2022-008",
    house: "Sapphire House",
    currentTerm: "Term 1 · 2026/2027",
    results: [
      {
        id: "somtochukwu-mathematics",
        subject: "Mathematics",
        score: 92,
        maxScore: 100,
        grade: "A",
        teacher: "Mr. Musa",
      },
      {
        id: "somtochukwu-english",
        subject: "English Language",
        score: 84,
        maxScore: 100,
        grade: "A",
        teacher: "Mrs. Nwosu",
      },
      {
        id: "somtochukwu-basic-science",
        subject: "Basic Science",
        score: 79,
        maxScore: 100,
        grade: "B",
        teacher: "Mr. Eze",
      },
      {
        id: "somtochukwu-business-studies",
        subject: "Business Studies",
        score: 88,
        maxScore: 100,
        grade: "A",
        teacher: "Mrs. Ojo",
      },
      {
        id: "somtochukwu-civic-education",
        subject: "Civic Education",
        score: 81,
        maxScore: 100,
        grade: "A",
        teacher: "Mr. Danjuma",
      },
      {
        id: "somtochukwu-yoruba",
        subject: "Yoruba",
        score: 76,
        maxScore: 100,
        grade: "B",
        teacher: "Mrs. Balogun",
      },
    ],
    fees: {
      totalBilled: 210_000,
      amountPaid: 210_000,
      dueDate: "2026-11-20",
      lastPaymentDate: "2026-10-05",
    },
  },
];

export const notices = [
  {
    id: "notice-mid-term-break",
    title: "Mid-term break: 9–13 November",
    body: "The school will be closed for the mid-term break from Monday 9 November to Friday 13 November. Boarding students should be picked up by 2:00 pm on Friday 6 November.",
    category: "Academic",
    publishedAt: "2026-10-30",
  },
  {
    id: "notice-parent-teacher-conference",
    title: "Term 1 parent–teacher conference",
    body: "Join us on Saturday 21 November from 9:00 am to 1:00 pm in the school hall. Please book a slot with your child's form teacher before Friday 13 November.",
    category: "Event",
    publishedAt: "2026-10-27",
  },
  {
    id: "notice-term-fees",
    title: "Term 1 fees deadline",
    body: "A reminder that Term 1 fees are due by 15 November 2026. Payments can be made by bank transfer or at the bursary. Contact the bursar if you need a payment plan.",
    category: "Finance",
    publishedAt: "2026-10-24",
  },
];

export const school = {
  name: "Crown Heights Academy",
  shortName: "CHA",
  currentTerm: "Term 1 · 2026/2027",
};
