"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/session";
import { parseNairaToKobo } from "@/lib/fees/invoice";
import { sendPaymentReceiptEmail } from "@/lib/fees/receiptEmail";
import {
  cancelFeeInvoice,
  createFeeInvoice,
  recordManualPayment,
} from "@/lib/fees/repository";

export type FeeActionState = { error?: string; success?: string } | null;

async function getBursarActor() {
  const actor = await getCurrentUser();
  return actor && (actor.role === "bursar" || actor.role === "admin") ? actor : null;
}

export async function createInvoiceAction(
  _previousState: FeeActionState,
  formData: FormData,
): Promise<FeeActionState> {
  void _previousState;
  const actor = await getBursarActor();
  if (!actor) return { error: "You do not have permission to create invoices." };

  const studentId = String(formData.get("studentId") ?? "").trim();
  const dueDate = String(formData.get("dueDate") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const template = String(formData.get("template") ?? "");
  const tuitionKobo = parseNairaToKobo(String(formData.get("tuitionAmount") ?? ""));
  const materialsKobo = parseNairaToKobo(String(formData.get("materialsAmount") ?? ""));
  if (!/^[0-9a-f-]{36}$/i.test(studentId)) return { error: "Choose a student." };
  if (!title || title.length > 120) return { error: "Enter an invoice title up to 120 characters." };
  if (template !== "term") return { error: "Choose a supported fee template." };
  if (tuitionKobo === null || materialsKobo === null) return { error: "Enter valid line amounts with up to two decimal places." };

  try {
    const invoice = await createFeeInvoice({
      studentId,
      title,
      dueDate,
      items: [
        { description: "Tuition", amountKobo: tuitionKobo },
        { description: "Learning materials", amountKobo: materialsKobo },
      ],
    });
    revalidatePath("/dashboard/bursar");
    revalidatePath("/fees", "layout");
    return { success: `Invoice ${invoice.invoiceNumber} created.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invoice could not be created." };
  }
}

export async function manualPaymentAction(
  _previousState: FeeActionState,
  formData: FormData,
): Promise<FeeActionState> {
  void _previousState;
  const actor = await getBursarActor();
  if (!actor) return { error: "You do not have permission to record payments." };

  const invoiceId = String(formData.get("invoiceId") ?? "").trim();
  const amountKobo = parseNairaToKobo(String(formData.get("amount") ?? ""));
  const method = String(formData.get("method") ?? "");
  const reference = String(formData.get("reference") ?? "").trim();
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return { error: "Choose an invoice." };
  if (amountKobo === null) return { error: "Enter a valid amount with up to two decimal places." };
  if (method !== "cash" && method !== "bank_transfer") return { error: "Choose cash or bank transfer." };
  if (!reference || reference.length > 100) return { error: "Enter a reference up to 100 characters." };

  try {
    const payment = await recordManualPayment({
      invoiceId,
      amountKobo,
      method,
      reference,
      recordedBy: actor.id,
    });
    await sendPaymentReceiptEmail(payment.id);
    revalidatePath("/dashboard/bursar");
    revalidatePath("/fees", "layout");
    return { success: `Payment recorded with receipt ${payment.receiptNumber}.` };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Payment could not be recorded." };
  }
}

export async function cancelInvoiceAction(
  invoiceId: string,
  _previousState: FeeActionState,
  _formData: FormData,
): Promise<FeeActionState> {
  void _previousState;
  void _formData;
  const actor = await getBursarActor();
  if (!actor) return { error: "You do not have permission to cancel invoices." };
  if (!/^[0-9a-f-]{36}$/i.test(invoiceId)) return { error: "Choose a valid invoice." };

  try {
    await cancelFeeInvoice(invoiceId);
    revalidatePath("/dashboard/bursar");
    revalidatePath("/fees", "layout");
    return { success: "Invoice cancelled." };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Invoice could not be cancelled." };
  }
}
