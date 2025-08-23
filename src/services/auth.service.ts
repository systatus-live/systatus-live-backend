import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService
  ) {}

  public generateJWT(data: any) {
    return this.jwtService.sign(data, {
      secret: process.env.JWT_KEY,
    })
  }

  public verifyJWT(jwt: string) {
    return this.jwtService.verify(jwt, {
      secret: process.env.JWT_KEY,
    });
  }

  public decodeJWT(jwt: string) {
    return this.jwtService.decode(jwt);
  }

  public bcryptHashSync(text: string): string {
    return bcrypt.hashSync(text, 16);
  }

  public bcryptCompareSync(encrypted: string, data: string): boolean {
    return bcrypt.compareSync(data, encrypted);
  }
}
