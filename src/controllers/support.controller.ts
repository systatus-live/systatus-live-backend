import { Body, Controller, Headers, InternalServerErrorException, Logger, Post } from "@nestjs/common";
import { MailService } from "../services/mail.service";
import { Throttle } from "@nestjs/throttler";

function escapeHtml(value: string): string {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

@Controller({
  version: "1",
  path: "/supports",
})
export class SupportController {
  private readonly logger = new Logger(SupportController.name);

  constructor(private readonly mailService: MailService) { }

  @Post("/mails")
  @Throttle({ default: { limit: 1, ttl: 60000 } })
  async sendMail(
    @Body() body: any,
    @Headers("host") host: string,
    @Headers("x-forwarded-host") forwardedHost: string,
  ) {
    try {
      await this.mailService.sendMail(
        "Systatus.Live <systatus@artcode.dev>",
        process.env.CONTACT_EMAIL as string,
        "[Nova Mensagem]",
        `
          <b>Origem:</b> ${host || forwardedHost}<br>
          <b>Nome:</b> ${escapeHtml(body.name)}<br>
          <b>E-mail:</b> ${escapeHtml(body.email)}<br>
          <b>Mensagem:</b><br>
          <i>${escapeHtml(body.message)}</i>
        `
      );

      return {
        message: "Mensagem enviada com sucesso!"
      };
    } catch (error) {
      this.logger.log(error.message);
      throw new InternalServerErrorException("Erro interno ao enviar a mensagem. Tente novamente ou comunique pelo e-mail no final da página.");
    }
  }
}
