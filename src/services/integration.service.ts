import { Injectable } from '@nestjs/common';
import axios from "axios";

@Injectable()
export class IntegrationService {
  private systatusAvatarUrl: string = "https://systatus.live/logos/systatus-live.png";

  public async sendSlackWebhook(url: string, title: string, description: string, footer: string) {
    const template = {
      attachments: [
        {
          color: "#113355",
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

  public async sendDiscordWebhook(url: string, title: string, description: string, footer: string) {
    const template = {
      content: null,
      embeds: [
        {
          title: title,
          description: description,
          color: 1127509,
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
      throw new Error(error.response.data.message);
    }
  }

  public async sendGoogleChatWebhook(url: string, title: string, description: string, footer: string) {
    const template = {
      cardsV2: [
        {
          cardId: "systatus.live",
          card: {
            header: {
              title: title,
              subtitle: description,
              imageUrl: this.systatusAvatarUrl,
              imageType: "CIRCLE"
            },
            sections: [
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
}