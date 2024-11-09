import { Injectable } from '@nestjs/common';
import * as bcrypt from "bcrypt";

@Injectable()
export class AuthService {
  bcryptHashSync(text: string): string {
    return bcrypt.hashSync(text, 12);
  }

  bcryptCompareSync(encrypted: string, data: string): boolean {
    return bcrypt.compareSync(data, encrypted);
  }
}
