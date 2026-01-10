import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateUsersAvatar1768070568761 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    const userList = await queryRunner.query("select id, name from users");
    for await (let user of userList) {
      await queryRunner.query(`update users set avatar = 'https://ui-avatars.com/api/?uppercase=true&name=${user.name}&size=320&background=eaedf1&color=113455' where id = '${user.id}'`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }

}
