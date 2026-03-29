import { MigrationInterface, QueryRunner } from "typeorm";

export class NomeMigration1774720469227 implements MigrationInterface {
  name = 'NomeMigration1774720469227'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_7536cba909dd7584a4640cad7d5"`);
    await queryRunner.query(`ALTER TABLE "subscriptions" DROP CONSTRAINT "FK_fbdba4e2ac694cf8c9cecf4dc84"`);
    await queryRunner.query(`ALTER TABLE "invoices" DROP CONSTRAINT "FK_2c09534a63cf2e612ab2ca3a252"`);
    await queryRunner.query(`ALTER TABLE "payments" DROP CONSTRAINT "FK_43d19956aeab008b49e0804c145"`);
    await queryRunner.query(`ALTER TABLE "monitors" DROP CONSTRAINT "FK_57f973548cfad5d93880e628623"`);
    await queryRunner.query(`ALTER TABLE "monitors" DROP CONSTRAINT "FK_a6b57dae6943b577cbda09899a6"`);
    await queryRunner.query(`ALTER TABLE "monitors" DROP CONSTRAINT "FK_887e857bf34016c3e0b86415b78"`);
    await queryRunner.query(`ALTER TABLE "integrations" DROP CONSTRAINT "FK_1c35f15afc8658d0b5ae9ee3532"`);
    await queryRunner.query(`ALTER TABLE "integrations" DROP CONSTRAINT "FK_68110c11fdc18bd6ee3c55d9ec7"`);
    await queryRunner.query(`ALTER TABLE "integrations" DROP CONSTRAINT "FK_a25946b36649e36a4eb5c403a6e"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" DROP CONSTRAINT "FK_fd082dd3c3ab0f7c7211bba0b3b"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" DROP CONSTRAINT "FK_260234474fe34dfbf962156849a"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" DROP CONSTRAINT "FK_f1f3dad7513668e77a06af3c005"`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" DROP CONSTRAINT "FK_c11c5215852d40a59111bd852db"`);
    await queryRunner.query(`ALTER TABLE "incidents" DROP CONSTRAINT "FK_77c92898211e6e84f9577380481"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" DROP CONSTRAINT "FK_76e6bc1b36985f66390ef06d391"`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" DROP CONSTRAINT "FK_c0e3e8da7834520d0463824f081"`);
    await queryRunner.query(`ALTER TABLE "auth_historical" DROP CONSTRAINT "FK_7f632038dee3a5065207e25b562"`);
    await queryRunner.query(`CREATE TYPE "public"."gateway_logs_provider_enum" AS ENUM('STRIPE')`);
    await queryRunner.query(`CREATE TABLE "gateway_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "provider" "public"."gateway_logs_provider_enum" NOT NULL, "json" jsonb NOT NULL DEFAULT '{}', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_1db20ff30ebaa48cc770037a216" PRIMARY KEY ("id"))`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_d0a95ef8a28188364c546eb65c1" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "subscriptions" ADD CONSTRAINT "FK_e45fca5d912c3a2fab512ac25dc" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "invoices" ADD CONSTRAINT "FK_5152c0aa0f851d9b95972b442e0" FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "payments" ADD CONSTRAINT "FK_563a5e248518c623eebd987d43e" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_7bd009ba04c5e8a5c147034c208" FOREIGN KEY ("interval_id") REFERENCES "intervals"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_6b445d8667ed4d0c361da98bc17" FOREIGN KEY ("created_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitors" ADD CONSTRAINT "FK_7b454624d92b8c1b98d567b176d" FOREIGN KEY ("updated_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_03ae91e14a0175d23f544feb4e2" FOREIGN KEY ("chat_platform_id") REFERENCES "chat_platforms"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_387cffeb691eb31d3c958a623a2" FOREIGN KEY ("created_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "integrations" ADD CONSTRAINT "FK_5519673229d31ee0b05525347b9" FOREIGN KEY ("updated_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_e9fe09cdb5bf1f1c6d720a17736" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_3bdeb3d6b9abccdaa94cd2016e1" FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_58be48e7f9b35e4d48756c350f4" FOREIGN KEY ("created_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_integrations" ADD CONSTRAINT "FK_b2a04bb49a6d2942db162adc534" FOREIGN KEY ("updated_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "incidents" ADD CONSTRAINT "FK_fc28fc30d8458756861ec6466e4" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_2a12c3dcd8791b3d475757e570b" FOREIGN KEY ("monitor_id") REFERENCES "monitors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "monitor_historical" ADD CONSTRAINT "FK_14191a2098f2a7c69f81e09e8ba" FOREIGN KEY ("incident_id") REFERENCES "incidents"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    await queryRunner.query(`ALTER TABLE "auth_historical" ADD CONSTRAINT "FK_1131299894aac5ec7793712f004" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
  }
}
