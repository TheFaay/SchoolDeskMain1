import { startApplicationPayment } from "@/lib/admissions/payments";

export async function POST(request: Request) {
  let body: { referenceNumber?: unknown; parentEmail?: unknown };
  try {
    body = await request.json() as typeof body;
  } catch {
    return Response.json({ error: "Invalid payment request." }, { status: 400 });
  }
  const referenceNumber = typeof body.referenceNumber === "string" ? body.referenceNumber.trim() : "";
  const parentEmail = typeof body.parentEmail === "string" ? body.parentEmail.trim().toLowerCase() : "";
  if (!/^CHA-\d{4}-[A-F0-9]{8}$/.test(referenceNumber) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
    return Response.json({ error: "Enter the application reference and parent email." }, { status: 400 });
  }
  try {
    const result = await startApplicationPayment({ referenceNumber, parentEmail });
    if (result.paid) {
      return Response.json({ paid: true, reference: result.reference });
    }
    return Response.json({ authorizationUrl: result.authorizationUrl, reference: result.reference });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Could not start the application fee checkout." }, { status: 400 });
  }
}
