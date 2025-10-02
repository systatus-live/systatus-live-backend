import { Injectable } from '@nestjs/common';
import axios from "axios";

@Injectable()
export class MailService {
  public sendMail(from: string, to: string, subject: string, message: string): Promise<any> {
    return axios.post(`${process.env.RESEND_API_URL}/emails`, {
      from: from,
      to: to,
      subject: subject,
      html: message
    }, {
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`
      }
    })
  }
}
