import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailerService {
  private resend: Resend;

  constructor(private config: ConfigService) {
    this.resend = new Resend(this.config.getOrThrow<string>('RESEND_API_KEY'));
  }

  async sendVerificationEmail(to: string, rawToken: string) {
    try {
      const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
      const verifyLink = `${frontendUrl}/verify-email?token=${rawToken}`;

      await this.resend.emails.send({
        from: this.config.getOrThrow<string>('FROM_EMAIL'),
        to,
        subject: 'Verify your email',
        html: `<p>Click to verify: <a href="${verifyLink}">${verifyLink}</a></p><p>Expires in 24 hours.</p>`,
      });
    } catch (err) {
      console.error(`Failed to send verification email to ${to}`, err);
    }
  }

  async sendPasswordResetEmail(to: string, rawToken: string) {
    try {
      const frontendUrl = this.config.getOrThrow<string>('FRONTEND_URL');
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      await this.resend.emails.send({
        from: this.config.getOrThrow<string>('FROM_EMAIL'),
        to,
        subject: 'Reset your password',
        html: `<p>Click to reset: <a href="${resetLink}">${resetLink}</a></p><p>Expires in 1 hour.</p>`,
      });
    } catch (err) {
      console.error(`Failed to send password reset email to ${to}`, err);
    }
  }
}
