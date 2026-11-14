import "server-only";

export const emailTemplates = {
  resultsPublished: (parent: string, children: string, term: string) => ({ subject: `${term} results are ready`, text: `Dear ${parent},\n\nResults for ${children} are now available in the parent portal.\n\nCrown Heights Academy` }),
  feeReceipt: (parent: string, receipt: string, amount: string) => ({ subject: `Fee payment receipt ${receipt}`, text: `Dear ${parent},\n\nWe received your payment of ${amount}. Receipt: ${receipt}.\n\nCrown Heights Academy` }),
  feeReminder: (parent: string, term: string, lines: string) => ({ subject: `School fee balance reminder · ${term}`, text: `Dear ${parent},\n\nOur records show the following outstanding balances for ${term}:\n${lines}\n\nPlease sign in to the parent portal to review your invoices and payment options.\n\nCrown Heights Academy` }),
  notice: (parent: string, subject: string, body: string) => ({ subject, text: `Dear ${parent},\n\n${body}\n\nThank you.\nCrown Heights Academy` }),
  admissionsReceived: (parent: string, reference: string, fee: string, resumeUrl: string) => ({ subject: `Application received · ${reference}`, text: `Dear ${parent},\n\nWe received your admission application. Reference: ${reference}. The application fee is ${fee}. Start or resume payment at ${resumeUrl} using your application reference and parent email. The entrance exam pass slip is issued after payment is confirmed.\n\nCrown Heights Academy` }),
  admissionsFeeReceived: (parent: string, reference: string, fee: string) => ({ subject: `Application fee received · ${reference}`, text: `Dear ${parent},\n\nWe have confirmed your ${fee} application fee for application ${reference}. Your entrance exam pass slip is ready in the payment confirmation page.\n\nCrown Heights Academy` }),
};
