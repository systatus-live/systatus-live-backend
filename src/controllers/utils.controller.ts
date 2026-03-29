import { BadRequestException, Controller, Get, NotFoundException, Param, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../middlewares/auth.guard";

@Controller({
  version: "1",
  path: "/utils",
})
@UseGuards(AuthGuard)
export class UtilsController {
  @Get("/cep/:cep")
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
  async getCities(@Param("state") state: string) {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${state}/municipios?orderBy=nome`);

    if (!response.ok) {
      throw new NotFoundException("Não foi possível carregar as cidades.");
    }

    const data: any[] = await response.json();

    return data.map((item) => item.nome as string);
  }
}
