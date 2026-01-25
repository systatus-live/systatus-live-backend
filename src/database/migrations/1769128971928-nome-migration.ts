import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1769128971928 implements MigrationInterface {
  name = 'NomeMigration1769128971928'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "billings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "subscriptionId" uuid NOT NULL, "price" double precision NOT NULL, "status" character varying(7) NOT NULL, "dueDate" TIMESTAMP WITH TIME ZONE NOT NULL, "paymentDate" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_b4c005480bcc7e02a04880c8b27" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "billings" ADD CONSTRAINT "FK_57ec79b4d8eb337378e44212469" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
