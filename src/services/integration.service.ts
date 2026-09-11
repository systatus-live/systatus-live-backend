import { Injectable } from '@nestjs/common';
import axios from "axios";
import { readFileSync } from 'fs';
import formatDate from 'src/utils/formatDate';
import { getHttpStatusKey, HttpStatusCodeLabel } from '../types/HttpStatusCode';
import formatSince from '../utils/formatSince';
import getCurrentDate from '../utils/getCurrenDate';
import { MailService } from './mail.service';

@Injectable()
export class IntegrationService {
  private systatusAvatarUrl: string = "https://systatus.live/logos/systatus-live.png";

  constructor(private mailService: MailService) { }

  public async sendSlackWebhook(url: string, title: string, description: string, footer: string, border: string) {
    const template = {
      attachments: [
        {
          color: border,
          title: title,
          text: description,
          footer: footer,
          footer_icon: this.systatusAvatarUrl
        }
      ]
    }

    try {
      const { data } = await axios.post(url, template);
      return data;
    } catch (error) {
      if (!error.response) throw new Error(error.message);
      throw new Error(error.response.data);
    }
  }

  public async sendMattermostWebhook(url: string, title: string, description: string, footer: string, border: string) {
    const template = {
      username: "Systatus",
      icon_url: this.systatusAvatarUrl,
      attachments: [
        {
          color: border,
          title: title,
          text: `${description}\n${footer}`,
        }
      ],
      priority: {
        priority: "important"
      }
    }

    try {
      const { data } = await axios.post(url, template);
      return data;
    } catch (error) {
      if (!error.response) throw new Error(error.message);
      throw new Error(error.response.data);
    }
  }

  public async sendDiscordWebhook(url: string, title: string, description: string, footer: string, border: string) {
    const template = {
      content: null,
      embeds: [
        {
          title: title,
          description: description,
          color: parseInt(border.replace(/^#/, ""), 16),
          footer: {
            text: footer,
            icon_url: this.systatusAvatarUrl
          },
        }
      ],
      username: "Systatus",
      avatar_url: this.systatusAvatarUrl,
      attachments: []
    }

    try {
      const { data } = await axios.post(url, template);
      return data;
    } catch (error) {
      if (!error.response) throw new Error(error.message);
      throw new Error(error.response.statusText);
    }
  }

  public async sendGoogleChatWebhook(url: string, title: string, description: string, footer: string) {
    const template = {
      cardsV2: [
        {
          cardId: "systatus",
          card: {
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: title
                    }
                  },
                  {
                    textParagraph: {
                      text: description
                    }
                  }
                ]
              },
              {
                widgets: [
                  {
                    textParagraph: {
                      text: footer
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    }

    try {
      const { data } = await axios.post(url, template);
      return data;
    } catch (error) {
      if (!error.response) throw new Error(error.message);
      throw new Error(error.response.data.error.message);
    }
  }

  public async sendWhatsApp(template: "systatus_monitor_up_pt_br" | "systatus_monitor_down_v2_pt_br", to: string, monitor: string, status: string, downtime: string, incidentId: string) {
    let parameterList = [
      {
        type: "text",
        parameter_name: "monitor",
        text: monitor
      },
      template == "systatus_monitor_up_pt_br" ? {
        type: "text",
        parameter_name: "downtime",
        text: downtime
      } : {
        type: "text",
        parameter_name: "status",
        text: status
      }
    ]

    const request = {
      messaging_product: "whatsapp",
      to: `55${to}`,
      type: "template",
      template: {
        name: template,
        language: {
          code: "pt_BR"
        },
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "text",
                parameter_name: "icon",
                text: template == "systatus_monitor_up_pt_br" ? "🟢" : "🔴"
              },
            ]
          },
          {
            type: "body",
            parameters: parameterList
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: incidentId
              }
            ]
          }
        ]
      },
    }

    try {
      const { data } = await axios.post(`https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, request, {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_API_KEY}`
        }
      });
      return data;
    } catch (error) {
      if (!error.response) throw new Error(error.message);
      throw new Error(error.response.data.error.message);
    }
  }

  public async sendMicrosoftTeamsWebhook(url: string, description: string, footer: string, isSuccess: boolean) {
    const template = {
      type: "message",
      attachments: [
        {
          contentType: "application/vnd.microsoft.card.adaptive",
          content: {
            type: "AdaptiveCard",
            $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
            version: "1.4",
            body: [
              {
                type: "Container",
                style: isSuccess ? "good" : "attention",
                items: [
                  {
                    type: "TextBlock",
                    text: description,
                    wrap: true
                  },
                  {
                    type: "TextBlock",
                    text: footer,
                    size: "Small",
                    isSubtle: true,
                    wrap: true
                  }
                ]
              }
            ]
          }
        }
      ]
    }

    try {
      const { data } = await axios.post(url, template);
      return data;
    } catch (error) {
      if (!error.response) throw new Error(error.message);
      throw new Error(error.response.data);
    }
  }

  public async sendMonitorEmail(
    to: string,
    title: string,
    isUp: boolean,
    monitorName: string,
    monitorAddress: string,
    newStatus: string,
    durationMs: number | null,
    incidentCreatedAt: string | null,
    actionUrl: string
  ): Promise<void> {
    const eventAt = formatDate(getCurrentDate(), "DD/MM/YYYY HH:mm:ss");
    const responseTimeLabel = durationMs != null ? `${durationMs}ms` : "—";

    let detailsRows = "";
    let alertNote = "";

    if (isUp) {
      const downtimeDuration = incidentCreatedAt ? formatSince(incidentCreatedAt, "YYYY-MM-DD HH:mm:ssZ") : "—";
      const incidentStartedAt = incidentCreatedAt ? formatDate(incidentCreatedAt, "DD/MM/YYYY HH:mm:ss") : "—";

      detailsRows = this.buildEmailRow("Dura&ccedil;&atilde;o", downtimeDuration, "#f9fafb")
        + this.buildEmailRow("Lat&ecirc;ncia", responseTimeLabel, "#10b981")
        + this.buildEmailRow("Incidente iniciado em", incidentStartedAt, "#f9fafb")
        + this.buildEmailRow("Resolvido em", eventAt, "#10b981");

      alertNote = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:20px;">
        <tr>
          <td bgcolor="#031a0f" style="background-color:#031a0f;padding:14px 16px;border:1px solid #14532d;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#6ee7b7;line-height:1.6;">
              O monitor retornou ao estado operacional e est&#225; respondendo normalmente.
            </p>
          </td>
        </tr>
      </table>`;
    } else {
      const statusLabel = HttpStatusCodeLabel[getHttpStatusKey(newStatus)] ?? newStatus;

      detailsRows = this.buildEmailRow("C&oacute;digo de erro", newStatus, "#ef4444")
        + this.buildEmailRow("Descri&ccedil;&atilde;o", statusLabel, "#f9fafb")
        + this.buildEmailRow("Detectado em", eventAt, "#f9fafb");

      alertNote = `<table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-top:20px;">
        <tr>
          <td bgcolor="#1c0a0a" style="background-color:#1c0a0a;padding:14px 16px;border:1px solid #3d1515;">
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#fca5a5;line-height:1.6;">
              Voc&ecirc; receber&aacute; uma nova notifica&ccedil;&atilde;o quando o monitor detectar disponibilidade.
            </p>
          </td>
        </tr>
      </table>`;
    }

    const emailBody = readFileSync(`${__dirname}/../assets/mail/Monitor.html`, "utf-8")
      .replace(/{{STATUS_BG}}/g, isUp ? "#052e1c" : "#2d0e0e")
      .replace(/{{STATUS_BORDER_COLOR}}/g, isUp ? "#10b981" : "#ef4444")
      .replace(/{{STATUS_TEXT_COLOR}}/g, isUp ? "#10b981" : "#ef4444")
      .replace(/{{STATUS_LABEL}}/g, isUp ? "&#10003;&nbsp;&nbsp;SERVI&#199;O OPERACIONAL" : "&#9888;&nbsp;&nbsp;INDISPONIBILIDADE DETECTADA")
      .replace(/{{MONITOR_NAME}}/g, monitorName)
      .replace(/{{MONITOR_URL}}/g, monitorAddress)
      .replace(/{{DETAILS_ROWS}}/g, detailsRows)
      .replace(/{{ALERT_NOTE}}/g, alertNote)
      .replace(/{{CTA_BG}}/g, isUp ? "#10b981" : "#ef4444")
      .replace(/{{CTA_TEXT}}/g, "Ver incidente")
      .replace(/{{ACTION_URL}}/g, actionUrl);

    await this.mailService.sendMail("Systatus <systatus@artcode.dev>", to, title, emailBody);
  }

  public renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
  }

  private buildEmailRow(label: string, value: string, valueColor: string): string {
    return `<tr>
      <td width="42%" bgcolor="#0d1520" style="background-color:#0d1520;padding:13px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#9ca3af;border-top:1px solid #1f2937;border-right:1px solid #1f2937;white-space:nowrap;">${label}</td>
      <td bgcolor="#111827" style="background-color:#111827;padding:13px 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;font-weight:600;color:${valueColor};border-top:1px solid #1f2937;word-break:break-all;">${value}</td>
    </tr>`;
  }
}
