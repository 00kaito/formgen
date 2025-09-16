import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const formTemplates = pgTable("form_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  fields: jsonb("fields").notNull().$type<FormField[]>(),
  isActive: boolean("is_active").notNull().default(true),
  shareableLink: varchar("shareable_link").notNull().unique(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const formResponses = pgTable("form_responses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  formTemplateId: varchar("form_template_id").notNull().references(() => formTemplates.id, { onDelete: "cascade" }),
  responses: jsonb("responses").notNull().$type<Record<string, any>>(),
  isComplete: boolean("is_complete").notNull().default(false),
  submittedAt: timestamp("submitted_at").notNull().default(sql`now()`),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").notNull().unique(),
  password: varchar("password").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'date' | 'select' | 'radio' | 'checkbox' | 'file' | 'table' | 'separator';

export type FormField = {
  id: string;
  type: FormFieldType;
  label: string;
  helpText?: string;
  required: boolean;
  options?: string[]; // for select, radio, checkbox
  placeholder?: string;
  acceptedFileTypes?: string[]; // for file uploads (e.g., ['.pdf', '.doc', '.jpg'])
  maxFileSize?: number; // in MB
  multiple?: boolean; // allow multiple file uploads
  columns?: string[]; // for table - column names
};

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  shareableLink: true,
});

export const insertFormResponseSchema = createInsertSchema(formResponses).omit({
  id: true,
  submittedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;
export type InsertFormResponse = z.infer<typeof insertFormResponseSchema>;
export type FormResponse = typeof formResponses.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
