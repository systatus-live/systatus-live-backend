import { Body, ConflictException, Controller, ForbiddenException, Get, InternalServerErrorException, NotFoundException, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { UserEntity } from '../database/entities/UserEntity';
import { AuthGuard } from '../guards/auth.guard';
import { AuthService } from '../services/auth.service';
import { MailService } from '../services/mail.service';

@Controller("users")
export class UserController {
  private userRepository: Repository<UserEntity> = null;

  constructor(
    private authService: AuthService,
    private dataSource: DataSource,
    private mailService: MailService
  ) {
    this.userRepository = this.dataSource.getRepository(UserEntity);
  }

  @Post()
  async createUser(@Body() body: any) {
    const newUser = {
      name: body.name,
      email: body.email,
      verified: false,
      password: null
    };

    let user = await this.userRepository.findOne({
      where: {
        email: newUser.email
      }
    })

    if (user && user.verified) {
      throw new ConflictException("E-mail already registered. Try logging in.");
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    if (!user) {
      try {
        user = await queryRunner.manager.save(UserEntity, {
          ...newUser,
          confirmation_code: this.authService.generateUUID().split("-")[0].toUpperCase()
        });
      } catch (error) {
        await queryRunner.rollbackTransaction();
        await queryRunner.release();
        throw new InternalServerErrorException(`Internal failure when creating the user. Please contact support.`);
      }
    }

    try {
      await this.mailService.sendMail(newUser.email, "Confirm your Systatus.Live account", "text/html", `
        <p>Hi, ${newUser.name}.</p>
        <p>Thank you for signing up for an Systatus.Live account!</p>
        <p>Copy the code below and paste it into the form to confirm your e-mail:</p>
        <p><b>${user.confirmation_code}</b></p>
        <hr>
        <p>Systatus.Live, an product of <a href="https://artcode.dev" target="_blank"">Artcode</a></p>
      `);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw new InternalServerErrorException(`Internal failure when sending the code. Please contact support.`);
    }

    await queryRunner.commitTransaction();
    await queryRunner.release();

    return {
      message: "User created successfully",
      data: {
        id: user.id
      }
    }
  }

  @Patch(":id")
  async confirmUser(@Param("id") id: string, @Body() body: any) {
    const { code, password } = body;

    let user = await this.userRepository.findOne({
      where: {
        id: id
      }
    })

    if (!user) {
      throw new NotFoundException("User not found.")
    }

    if (user.verified) {
      throw new ConflictException(`User already confirmed.`);
    }

    if (user.confirmation_code != code) {
      throw new ForbiddenException(`Invalid code. Please enter the correct code received in your inbox or spam folder.`)
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(UserEntity, id, {
        verified: true,
        confirmation_code: null,
        password: this.authService.bcryptHashSync(password)
      })
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw new InternalServerErrorException(`Internal failure when confirmation the user. Please contact support.`);
    }

    try {
      await this.mailService.sendMail(user.email, "Your Systatus.Live account has been confirmed.", "text/html", `
        <p>Hi, ${user.name}.</p>
        <p>Your Systatus.Live account has been confirmed at the email ${user.email}. Log in to use the aplication features.</p>
        <hr>
        <p>Systatus.Live, an product of <a href="https://artcode.dev" target="_blank"">Artcode</a></p>
      `);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      throw new InternalServerErrorException(`Internal failure when sending the confirmation e-mail. Please contact support.`);
    }

    await queryRunner.commitTransaction();
    await queryRunner.release();

    return {
      message: "User successfully confirmed.",
      data: {
        id: user.id
      }
    }
  }

  @UseGuards(AuthGuard)
  @Get("me")
  async getProfile(@Request() req: Request) {
    const user = await this.userRepository.findOne({
      where: {
        id: req.headers["logged_user_id"]
      },
      select: ["id", "name", "email", "created_at", "updated_at"]
    });
    if (!user) {
      throw new NotFoundException("User not found.");
    }
    return user;
  }
}
