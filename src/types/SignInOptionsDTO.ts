import { SignInTypeEnum } from "./SignInTypeEnum";

export type SignInOptionsDTO = {
  google?: {
    clientId: string;
    client_id: string;
    credential: string;
    select_by: string;
  };
  email?: string;
  password?: string;
  type: SignInTypeEnum;
  keepConected: boolean
}