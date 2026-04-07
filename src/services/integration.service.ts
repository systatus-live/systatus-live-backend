import { Injectable } from '@nestjs/common';
import axios from "axios";

@Injectable()
export class IntegrationService {
  private systatusAvatarUrl: string = "https://systatus.live/logos/systatus-live.png";

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
      username: "Systatus.Live",
      avatar_url: this.systatusAvatarUrl,
      attachments: []
    }

    try {
      const { data } = await axios.post(url, template);
      return data;
    } catch (error) {
      throw new Error(error.response.statusText);
    }
  }

  public async sendGoogleChatWebhook(url: string, title: string, description: string, footer: string) {
    const template = {
      cardsV2: [
        {
          cardId: "systatus.live",
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
      throw new Error(error.response.data.error.message);
    }
  }

  public async sendWhatsApp(template: "systatus_monitor_up" | "systatus_monitor_down", to: string, monitor: string, status: string, downtime: string) {
    let parameterList = [
      {
        type: "text",
        parameter_name: "monitor",
        text: monitor
      },
      template == "systatus_monitor_up" ? {
        type: "text",
        parameter_name: "downtime",
        text: downtime
      } : {
        type: "text",
        parameter_name: "status",
        text: status
      },
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
            type: "body",
            parameters: parameterList
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
      throw new Error(error.response.data.error.message);
    }
  }
}