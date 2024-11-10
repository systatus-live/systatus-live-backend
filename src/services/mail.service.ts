import { Injectable } from '@nestjs/common';
import axios from "axios";

@Injectable()
export class MailService {
  private sendGridApiUrl = "https://api.sendgrid.com";
  private sendGridApiKey = process.env.SENDGRID_API_KEY;
  private defaultFrom = "Systatus.Live <artur@artcode.dev>";

  async sendMail(to: string, subject: string, type: "text/html" | "text/plain", content: string) {
    const { data } = await axios.post(`${this.sendGridApiUrl}/v3/mail/send`, {
      personalizations: [
        {
          to: [
            {
              email: to
            }
          ]
        }
      ],
      from: {
        email: this.defaultFrom
      },
      subject: subject,
      content: [
        {
          type: type, 
          value: content
        }
      ]
    }, {
      headers: {
        Authorization: `Bearer ${this.sendGridApiKey}`
      }
    })
  }
}