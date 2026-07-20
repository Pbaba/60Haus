export const emailService = {
  /**
   * Stub for sending an email. 
   * In the final architecture, this will be handled by a Supabase Edge Function
   * using the Resend API, triggered by the pg_cron scheduler.
   */
  async sendVerificationReminder(ownerEmail: string, propertyTitle: string) {
    console.log(`[EmailService Stub] Sending verification reminder to ${ownerEmail} for property: ${propertyTitle}`);
    
    // Future implementation:
    // await supabase.functions.invoke('send-email', {
    //   body: {
    //     to: ownerEmail,
    //     subject: 'Is your property still available?',
    //     template: 'verification_reminder',
    //     data: { propertyTitle }
    //   }
    // });
  }
};
