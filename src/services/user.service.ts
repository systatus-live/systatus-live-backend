import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../database/entities/user.entity';
import { Repository } from 'typeorm';
import { CreateUserDTO } from '../dtos/CreateUserDTO';
import { UpdateUserDTO } from 'src/dtos/UpdateUserDTO';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity) private usersRepository: Repository<UserEntity>
  ) { }

  async save(data: CreateUserDTO) {
    const newUser = this.usersRepository.create(data);
    await this.usersRepository.save(newUser);
    return newUser;
  }

  async update(id: string, data: UpdateUserDTO) {
    await this.usersRepository.update(id, data);
  }

  findAll(): Promise<UserEntity[]> {
    return this.usersRepository.find({
      select: ["id", "name", "email", "created_at", "updated_at"],
      order: {
        id: "DESC"
      }
    });
  }

  findOne(id: string): Promise<UserEntity | null> {
    return this.usersRepository.findOne({
      where: {
        id: id
      },
      select: ["id", "name", "email", "created_at", "updated_at", "password"]
    });
  }

  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }
}