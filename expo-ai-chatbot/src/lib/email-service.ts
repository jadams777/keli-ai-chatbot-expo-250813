import * as MailComposer from 'expo-mail-composer';
import { UIMessage } from './utils';

// Email service for sending feedback
export class EmailService {
  constructor() {
    // No initialization needed for expo-mail-composer
  }

  async sendFeedback(messages: UIMessage[], userFeedback?: string): Promise<void> {
    try {
      // Check if mail composer is available
      const isAvailable = await MailComposer.isAvailableAsync();
      if (!isAvailable) {
        console.warn('Mail composer is not available on this device');
        return;
      }

      // Format chat session content
      const chatContent = this.formatChatSession(messages, userFeedback);
      
      const mailOptions = {
        recipients: [process.env.FEEDBACK_EMAIL || 'feedback@keli.ai'],
        subject: 'User Feedback - Chat Session',
        body: chatContent,
        isHtml: true,
      };

      await MailComposer.composeAsync(mailOptions);
      console.log('Feedback email composer opened successfully');
    } catch (error) {
      console.error('Failed to open feedback email composer:', error);
      throw error;
    }
  }

  private formatChatSession(messages: UIMessage[], userFeedback?: string): string {
    const timestamp = new Date().toISOString();
    
    let html = `
      <h2>User Feedback Report</h2>
      <p><strong>Timestamp:</strong> ${timestamp}</p>
      ${userFeedback ? `<p><strong>User Feedback:</strong> ${userFeedback}</p>` : ''}
      <hr>
      <h3>Chat Session:</h3>
    `;

    messages.forEach((message, index) => {
      const roleLabel = message.role === 'user' ? 'User' : 'Assistant';
      html += `
        <div style="margin-bottom: 20px; padding: 10px; border-left: 3px solid ${message.role === 'user' ? '#007bff' : '#28a745'};">
          <strong>${roleLabel}:</strong>
          <div style="margin-top: 5px;">${message.content.replace(/\n/g, '<br>')}</div>
        </div>
      `;
    });

    return html;
  }
}

// Singleton instance
export const emailService = new EmailService();