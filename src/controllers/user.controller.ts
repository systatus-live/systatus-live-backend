import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, InternalServerErrorException, NotFoundException, Param, Patch, Query, Request, UnprocessableEntityException, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectRepository } from '@nestjs/typeorm';
import { del, put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import fs from "fs";
import { diskStorage } from 'multer';
import path, { extname } from "path";
import { PlanService } from '../services/plan.service';
import { DataSource, Not, Repository } from 'typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { AuthService } from '../services/auth.service';
import { SubscriptionEntity } from '../database/entities/SubscriptionEntity';
import formatDate from 'src/utils/formatDate';
import momentTz from "moment-timezone";

@Controller({
  version: "1",
  path: "/users"
})
@UseGuards(AuthGuard)
export class UserController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>
  @InjectRepository(SubscriptionEntity) private subscriptionRepository: Repository<SubscriptionEntity>

  private querySize: number = parseInt(process.env.QUERY_SIZE as string);

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private planService: PlanService
  ) { }

  @Patch("/details")
  @UseInterceptors(FileInterceptor("avatar", {
    limits: {
      fileSize: 1024 * 1024, // 1MB
    },
    fileFilter: (_, file, cb) => {
      const acceptedFormats = [".jpg", ".jpeg", ".png"];
      if (!acceptedFormats.includes(extname(file.originalname))) {
        cb(new Error(`Formato inválido. Envie ${acceptedFormats.join(", ")}.`), false);
      }
      cb(null, true);
    },
    storage: diskStorage({
      destination: path.join(process.cwd(), "tmp", "avatars"),
      filename: (_, file, cb) => {
        cb(null, `${randomUUID()}${extname(file.originalname)}`)
      }
    })
  }))
  async updateDetails(@Request() request: Request, @Body() body: any, @UploadedFile() avatarFile?: Express.Multer.File) {
    const findEmail = await this.userRepository.findOne({
      where: {
        id: Not(request["loggedUser"]),
        email: body.email
      }
    })

    if (findEmail) {
      throw new ConflictException("E-mail já está registrado e não pode ser usado.");
    }

    const findUser = await this.userRepository.findOne({
      where: {
        id: request["loggedUser"]
      }
    })

    let savedUser: Partial<UserEntity> = {
      id: request["loggedUser"],
      name: body.name,
      email: body.email,
      avatar: findUser?.avatar
    }

    if (avatarFile) {
      try {
        if (findUser?.avatar) {
          await del(findUser!.avatar, {
            token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN
          }).catch(_ => {
            throw new Error("Não foi possível atualizar a imagem.");
          });
        }

        const blob = await put(`/${process.env.NODE_ENV}/users/${request["loggedUser"]}/avatar/${avatarFile.filename}`, fs.readFileSync(avatarFile.path), {
          access: "public",
          allowOverwrite: true,
          token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN,
          addRandomSuffix: false
        }).catch(_ => {
          throw new Error("Não foi possível armazenar a imagem.");
        })

        savedUser.avatar = blob.url;
      } catch (error) {
        throw new UnprocessableEntityException(error.message);
      } finally {
        fs.unlinkSync(avatarFile.path);
      }
    } else if (body.rmAvatar == "1" && findUser?.avatar) {
      await del(findUser!.avatar, {
        token: process.env.VERCEL_BLOB_READ_WRITE_TOKEN
      }).catch(_ => {
        throw new InternalServerErrorException("Não foi possível excluir a imagem.");
      });
      savedUser.avatar = null;
    }

    try {
      await this.userRepository.save(savedUser);

      return {
        message: "Usuário atualizado com sucesso.",
        data: {
          name: savedUser.name,
          email: savedUser.email,
          avatar: savedUser.avatar
        }
      }
    } catch (error) {
      throw new InternalServerErrorException("Falha ao atualizar o usuário.");
    }
  }

  @Patch("/passwords")
  async updatePassword(@Request() request: Request, @Body() body: any) {
    const findUser = await this.userRepository.findOne({
      where: {
        id: request["loggedUser"]
      }
    })

    if (findUser?.password && !this.authService.bcryptCompareSync(findUser.password, body.currentPassword)) {
      throw new ForbiddenException("Senha atual está incorreta.");
    }

    try {
      await this.userRepository.update(request["loggedUser"], {
        password: this.authService.bcryptHashSync(body.newPassword)
      })

      return {
        message: "Senha atualizada com sucesso.",
      }
    } catch (error) {
      throw new InternalServerErrorException("Falha ao atualizar a senha.");
    }
  }

  @Get("/auth-history")
  async getAuthHistory(@Request() request: Request, @Query("page") page: string) {
    if (page == null || isNaN(parseInt(page)) || parseInt(page) < 0) {
      throw new BadRequestException("Informe o parâmetro numérico 'page >= 0'");
    }

    const results = await Promise.all([
      this.dataSource.query(`
        select his.*
        from auth_historical his
        where his.user_id = '${request["loggedUser"]}'
        order by his.created_at desc
        limit ${this.querySize} offset ${this.querySize * parseInt(page)}
      `),
      this.dataSource.query(`
        select count(1) as total
        from auth_historical his
        where his.user_id = '${request["loggedUser"]}'
      `),
    ]);

    const list = results[0];
    list.forEach(row => {
      if (row.location_json) {
        row.location_json = JSON.parse(row.location_json);
      }
    })

    return {
      data: list,
      pagination: {
        rows: this.querySize,
        total: parseInt(results[1][0].total)
      }
    }
  }

  @Get("/subscriptions")
  @UseGuards(AuthGuard)
  async getPlanById(@Request() request: Request) {
    const subscription = await this.subscriptionRepository.findOne({
      where: {
        id: request["loggedSubscription"]
      },
      relations: ["plan"]
    })

    const plan = await this.planService.getPlanById(subscription!.plan!.id);

    momentTz.locale("pt-br");
    plan["nextBilling"] = formatDate(momentTz(subscription!.end_date!).tz("America/Sao_Paulo").add(1, "days"), "D [de] MMMM [de] YYYY");

    return plan;
  }
}
