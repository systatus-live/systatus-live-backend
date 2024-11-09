import { Body, Controller, Delete, Get, NotFoundException, Param, Post, Put } from '@nestjs/common';
import { CreateUserDTO } from '../dtos/CreateUserDTO';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';
import { UpdateUserDTO } from 'src/dtos/UpdateUserDTO';

@Controller("users")
export class UserController {
  constructor(
    private userService: UserService,
    private authService: AuthService
  ) { }

  @Post()
  async createUser(@Body() body: CreateUserDTO) {
    const { id } = await this.userService.save({
      name: body.name,
      email: body.email,
      password: this.authService.bcryptHashSync(body.password)
    });
    return {
      message: "User created successfully",
      data: {
        id: id
      }
    }
  }

  @Get(":id")
  getUserList() {
    return this.userService.findAll();
  }

  @Get(":id")
  getUserById(@Param("id") id: string) {
    return this.userService.findOne(id);
  }

  @Delete(":id")
  async deleteUser(@Param("id") id: string) {
    const findUser = await this.userService.findOne(id);
    if (!findUser) {
      throw new NotFoundException("User not found")
    }

    await this.userService.remove(id);

    return {
      message: "User deleted successfully"
    }
  }

  @Put(":id")
  async updateUser(@Param("id") id: string, @Body() body: UpdateUserDTO) {
    const findUser = await this.userService.findOne(id);
    if (!findUser) {
      throw new NotFoundException("User not found")
    }
    
    await this.userService.update(id, {
      name: body.name,
      email: body.email
    });
    return {
      message: "User updated successfully"
    }
  }
}
