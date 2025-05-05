import { Injectable } from '@nestjs/common';
import { createTransport } from "nodemailer";
import { Attachment } from 'nodemailer/lib/mailer';

@Injectable()
export class MailService {
  private transporter: any;

  constructor() {
    this.transporter = createTransport({
      host: process.env.SMTP_HOST,
      port: +process.env.SMTP_PORT!,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  verify() {
    this.transporter.verify((error, success) => {
      if (error) {
        console.log("[E-MAIL] Error: " + error.message)
      } else {
        console.log("[E-MAIL] Configured successfully")
      }
    })
  }

  public sendMail(to: string, subject: string, message: string, attachments?: Array<Attachment>): Promise<any> {
    return new Promise(async (resolve, reject) => {
      const mailOptions = {
        from: process.env.SMTP_FROM,
        to: to,
        subject: subject,
        html: message,
        attachments: attachments
      };

      await this.transporter.sendMail(mailOptions, (error, success) => {
        if (error) {
          reject(error);
        } else {
          resolve(true);
        }
      })
    });
  }
}
