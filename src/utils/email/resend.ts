import { Resend } from 'resend';
import { env } from '~/env';

// Initialize Resend with API key
const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailParams {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  from?: string;
}

/**
 * Sends an email using Resend as the SMTP provider
 */
export async function sendEmail({ 
  to, 
  subject, 
  text, 
  html, 
  from
}: SendEmailParams): Promise<{success: boolean; error?: string}> {
  try {
    // For Resend, either html or text is required, not both
    const emailContent = html 
      ? { html } 
      : { text: text || `${subject} - Please contact support if you're seeing this message.` };

    const { data, error } = await resend.emails.send({
      from,
      to: [to],
      subject,
      ...emailContent
    });

    if (error) {
      console.error('Error sending email via Resend:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Exception when sending email via Resend:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
} 