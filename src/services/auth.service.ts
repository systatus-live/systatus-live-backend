import { Injectable } from '@nestjs/common';
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

@Injectable()
export class AuthService {
  public bcryptHashSync(text: string): string {
    return bcrypt.hashSync(text, 12);
  }

  public bcryptCompareSync(encrypted: string, data: string): boolean {
    return bcrypt.compareSync(data, encrypted);
  }

  public generateUUID(): string {
    return uuidv4();
  }

}
