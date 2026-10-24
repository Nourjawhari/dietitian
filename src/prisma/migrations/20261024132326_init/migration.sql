-- CreateEnum
CREATE TYPE "role" AS ENUM ('patient', 'admin', 'super_admin');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('male', 'female');

-- CreateEnum
CREATE TYPE "language" AS ENUM ('en', 'ar');

-- CreateEnum
CREATE TYPE "extraction_status" AS ENUM ('pending', 'success', 'failed', 'reviewed');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'rescheduled');

-- CreateEnum
CREATE TYPE "recurrence_pattern" AS ENUM ('none', 'weekly', 'biweekly');

-- CreateEnum
CREATE TYPE "notification_channel" AS ENUM ('whatsapp', 'email');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('confirmation', 'reminder', 'cancellation', 'reschedule');

-- CreateEnum
CREATE TYPE "notification_status" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "contact_submission_status" AS ENUM ('unread', 'read', 'replied', 'archived');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone_number" TEXT,
    "role" "role" NOT NULL DEFAULT 'patient',
    "preferred_language" "language" NOT NULL DEFAULT 'en',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revoked_token" (
    "jti" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_token_pkey" PRIMARY KEY ("jti")
);

-- CreateTable
CREATE TABLE "patient" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" "gender",
    "phone" TEXT,
    "note" TEXT,
    "whatsapp_opt_in_at" TIMESTAMP(6),
    "ai_processing_consent_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dietitian" (
    "user_id" TEXT NOT NULL,

    CONSTRAINT "dietitian_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "patient_health_record" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "height" DECIMAL(5,2) NOT NULL,
    "weight" DECIMAL(6,2) NOT NULL,
    "bmi" DECIMAL(5,2) NOT NULL,
    "is_obese" BOOLEAN NOT NULL,
    "chronic_conditions" JSONB NOT NULL DEFAULT '[]',
    "allergies" JSONB NOT NULL DEFAULT '[]',
    "dietitian_goal" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "patient_health_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "body_composition_report" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "file_path" TEXT,
    "extraction_status" "extraction_status" NOT NULL DEFAULT 'pending',
    "body_fat_percentage" DECIMAL(5,2),
    "visceral_fat_level" DECIMAL(5,2),
    "basal_metabolic_rate" DECIMAL(8,2),
    "muscle_mass" DECIMAL(6,2),
    "extraction_error" TEXT,
    "reviewed_by_dietitian_id" TEXT,
    "reviewed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "body_composition_report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "appointment_duration" INTEGER NOT NULL DEFAULT 60,
    "buffer_time" INTEGER NOT NULL DEFAULT 15,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "appointment_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_slot" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "appointment_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "slot_id" TEXT,
    "appointment_date" DATE NOT NULL,
    "start_time" TIME(6) NOT NULL,
    "end_time" TIME(6) NOT NULL,
    "status" "appointment_status" NOT NULL DEFAULT 'pending',
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrence_pattern" "recurrence_pattern" NOT NULL DEFAULT 'none',
    "parent_appointment_id" TEXT,
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_notification" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "channel" "notification_channel" NOT NULL,
    "notification_type" "notification_type" NOT NULL,
    "scheduled_at" TIMESTAMP(6),
    "sent_at" TIMESTAMP(6),
    "status" "notification_status" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_submission" (
    "id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" "contact_submission_status" NOT NULL DEFAULT 'unread',
    "submitted_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6),

    CONSTRAINT "contact_submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "language" "language" NOT NULL,
    "updated_at" TIMESTAMP(6),
    "deleted_at" TIMESTAMP(6),

    CONSTRAINT "page_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_section" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "section_key" TEXT,
    "content" JSONB,
    "display_order" INTEGER,

    CONSTRAINT "page_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_tip" (
    "id" TEXT NOT NULL,
    "section_id" TEXT,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "language" "language" NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "health_tip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_username_key" ON "user"("username");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE INDEX "revoked_token_user_id_idx" ON "revoked_token"("user_id");

-- CreateIndex
CREATE INDEX "revoked_token_expires_at_idx" ON "revoked_token"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_user_id_key" ON "patient"("user_id");

-- CreateIndex
CREATE INDEX "patient_health_record_patient_id_recorded_at_idx" ON "patient_health_record"("patient_id", "recorded_at");

-- CreateIndex
CREATE INDEX "body_composition_report_patient_id_idx" ON "body_composition_report"("patient_id");

-- CreateIndex
CREATE INDEX "body_composition_report_reviewed_by_dietitian_id_idx" ON "body_composition_report"("reviewed_by_dietitian_id");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slot_date_start_time_key" ON "appointment_slot"("date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_slot_id_key" ON "appointment"("slot_id");

-- CreateIndex
CREATE INDEX "appointment_patient_id_idx" ON "appointment"("patient_id");

-- CreateIndex
CREATE INDEX "appointment_appointment_date_start_time_idx" ON "appointment"("appointment_date", "start_time");

-- CreateIndex
CREATE INDEX "appointment_parent_appointment_id_idx" ON "appointment"("parent_appointment_id");

-- CreateIndex
CREATE INDEX "appointment_notification_appointment_id_idx" ON "appointment_notification"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_notification_status_scheduled_at_idx" ON "appointment_notification"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "contact_submission_status_idx" ON "contact_submission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "page_slug_language_key" ON "page"("slug", "language");

-- CreateIndex
CREATE INDEX "page_section_page_id_display_order_idx" ON "page_section"("page_id", "display_order");

-- CreateIndex
CREATE UNIQUE INDEX "page_section_page_id_section_key_key" ON "page_section"("page_id", "section_key");

-- CreateIndex
CREATE INDEX "health_tip_section_id_idx" ON "health_tip"("section_id");

-- CreateIndex
CREATE INDEX "health_tip_language_is_published_idx" ON "health_tip"("language", "is_published");

-- AddForeignKey
ALTER TABLE "revoked_token" ADD CONSTRAINT "revoked_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient" ADD CONSTRAINT "patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dietitian" ADD CONSTRAINT "dietitian_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_health_record" ADD CONSTRAINT "patient_health_record_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_composition_report" ADD CONSTRAINT "body_composition_report_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "body_composition_report" ADD CONSTRAINT "body_composition_report_reviewed_by_dietitian_id_fkey" FOREIGN KEY ("reviewed_by_dietitian_id") REFERENCES "dietitian"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_settings" ADD CONSTRAINT "appointment_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_slot_id_fkey" FOREIGN KEY ("slot_id") REFERENCES "appointment_slot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment" ADD CONSTRAINT "appointment_parent_appointment_id_fkey" FOREIGN KEY ("parent_appointment_id") REFERENCES "appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_notification" ADD CONSTRAINT "appointment_notification_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_section" ADD CONSTRAINT "page_section_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_tip" ADD CONSTRAINT "health_tip_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "page_section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
