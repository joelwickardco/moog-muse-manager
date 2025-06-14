import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInitialSchema1709000000000 implements MigrationInterface {
  name = 'CreateInitialSchema1709000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "libraries" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "name" varchar NOT NULL,
        "fingerprint" varchar NOT NULL,
        CONSTRAINT "UQ_libraries_name" UNIQUE ("name"),
        CONSTRAINT "UQ_libraries_fingerprint" UNIQUE ("fingerprint")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "banks" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "bank_number" integer NOT NULL,
        "library_id" integer NOT NULL,
        "name" varchar NOT NULL,
        "type" varchar CHECK( type IN ('patch','sequence') ) NOT NULL,
        "content" blob,
        "fingerprint" varchar NOT NULL,
        CONSTRAINT "FK_banks_library" FOREIGN KEY ("library_id") REFERENCES "libraries" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "patches" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "patch_number" integer NOT NULL,
        "bank_id" integer NOT NULL,
        "fingerprint" varchar NOT NULL,
        "content" text,
        "name" varchar NOT NULL,
        "default_patch" boolean NOT NULL DEFAULT (0),
        "favorited" boolean NOT NULL DEFAULT (0),
        "tags" text,
        CONSTRAINT "FK_patches_bank" FOREIGN KEY ("bank_id") REFERENCES "banks" ("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "patch_sequences" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "sequence_number" integer NOT NULL,
        "bank_id" integer NOT NULL,
        "name" varchar NOT NULL,
        "fingerprint" varchar NOT NULL,
        "content" text NOT NULL,
        CONSTRAINT "FK_patch_sequences_bank" FOREIGN KEY ("bank_id") REFERENCES "banks" ("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "patch_sequences"');
    await queryRunner.query('DROP TABLE "patches"');
    await queryRunner.query('DROP TABLE "banks"');
    await queryRunner.query('DROP TABLE "libraries"');
  }
} 