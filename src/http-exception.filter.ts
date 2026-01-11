import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import { MulterError } from "multer";
import { HttpStatusCode } from "./types/HttpStatusCode";

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // Multer
    if (exception instanceof MulterError) {
      let message = "Erro no upload do arquivo.";

      if (exception.code === "LIMIT_FILE_SIZE") {
        message = "Arquivo maior que o permitido.";
      }

      return response.status(HttpStatusCode.UNPROCESSABLE_ENTITY).json({
        message
      });
    }

    // Nest (HTTP)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();

      return response.status(status).json(typeof res === "string" ? { message: res } : res);
    }

    // Erros não tratados
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      message: (exception as any).toString()
    });
  }
}
