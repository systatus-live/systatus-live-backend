import { BadRequestException, Controller, Get, NotFoundException, Param, Query, Res, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../middlewares/auth.guard";
import { Response } from "express";
import axios from "axios";
import { existsSync, readFileSync } from 'fs';
import { Agent } from 'https';
import { rootCertificates } from 'tls';

@Controller({
  version: "1",
  path: "/utils",
})
export class UtilsController {
  private buildHttpsAgent() {
    const caPath = process.env.NODE_EXTRA_CA_CERTS;
    const ca = (caPath && existsSync(caPath)) ? [...rootCertificates, readFileSync(caPath, "utf8")] : [...rootCertificates];
    return new Agent({
      ca: ca,
      rejectUnauthorized: false
    });
  }

  @Get("/cep/:cep")
  @UseGuards(AuthGuard)
  async getCep(@Param("cep") cep: string) {
    const clean = cep.replace(/\D/g, "");

    if (clean.length !== 8) {
      throw new BadRequestException("CEP inválido.");
    }

    const response = await fetch(`https://viacep.com.br/ws/${clean}/json/`);

    if (!response.ok) {
      throw new NotFoundException("CEP não encontrado.");
    }

    const data = await response.json();

    if (data.erro) {
      throw new NotFoundException("CEP não encontrado.");
    }

    return {
      address: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  }

  @Get("/states")
  @UseGuards(AuthGuard)
  async getStates() {
    const response = await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome");

    if (!response.ok) {
      throw new NotFoundException("Não foi possível carregar os estados.");
    }

    const data: any[] = await response.json();

    return data.map((item) => ({
      code: item.sigla,
      name: item.nome,
    }));
  }

  @Get("/cities/:state")
  @UseGuards(AuthGuard)
  async getCities(@Param("state") state: string) {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`);

    if (!response.ok) {
      throw new NotFoundException("Não foi possível carregar as cidades.");
    }

    const data: any[] = await response.json();

    return data.map((item) => item.nome as string);
  }

  @Get("/favicon")
  async getFavicon(@Query("url") url: string, @Res() res: Response) {
    const fallback = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>';

    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Cache-Control", "public, max-age=86400");

    let parsed: URL;

    try {
      parsed = new URL(url);
    } catch {
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(fallback);
      return;
    }

    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(fallback);
      return;
    }

    try {
      const response = await axios.get(`${parsed.origin}/favicon.ico`, {
        responseType: "arraybuffer",
        timeout: 5000,
        httpsAgent: this.buildHttpsAgent()
      });

      res.setHeader("Content-Type", String(response.headers["content-type"] ?? "image/x-icon"));
      res.send(Buffer.from(response.data));
    } catch (error) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.send(fallback);
    }
  }
}
