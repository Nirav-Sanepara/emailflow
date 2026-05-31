import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function sendEmailViaProvider(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string; response?: string }> {
  try {
    const result = await getResend().emails.send({
      from: `onboarding@resend.dev`,
      to,
      subject,
      html,
    });

    if (result.error) {
      return { success: false, error: result.error.message };
    }

    return { success: true, response: result.data?.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { success: false, error: message };
  }
}
