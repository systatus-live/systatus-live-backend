import { Body, ConflictException, Controller, ForbiddenException, InternalServerErrorException, Patch, Request, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthGuard } from '../guards/auth/auth.guard';
import { AuthService } from '../services/auth.service';

@Controller({
  version: "1",
  path: "/users"
})
export class UserController {
  @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>

  constructor(
    private authService: AuthService
  ) { }


  @Patch("/details")
  @UseGuards(AuthGuard)
  async updateUserDetails(@Request() request: Request, @Body() body: any) {
    const findEmail = await this.userRepository.findOne({
      where: {
        id: Not(request["loggedUser"]),
        email: body.email
      }
    })

    if (findEmail) {
      throw new ConflictException("E-mail já está registrado e não pode ser usado.");
    }

    try {
      await this.userRepository.update(request["loggedUser"], {
        name: body.name,
        email: body.email
      })

      return {
        message: "Usuário atualizado com sucesso."
      }
    } catch (error) {
      throw new InternalServerErrorException("Falha ao atualizar o usuário.");
    }
  }

  @Patch("/passwords")
  @UseGuards(AuthGuard)
  async resetPassword(@Request() request: Request, @Body() body: any) {
    const findUser = await this.userRepository.findOne({
      where: {
        id: request["loggedUser"]
      }
    })

    if (!this.authService.bcryptCompareSync(findUser!.password!, body.currentPassword)) {
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
}
