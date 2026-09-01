import { z } from 'zod';
import { paginatedResponseSchema } from '../core';

export const journalLineSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  description: z.string().nullable(),
  debit: z.number(),
  credit: z.number(),
  projectId: z.string().nullable(),
  wbsItemId: z.string().nullable(),
  account: z.object({ code: z.string(), name: z.string() }).nullable().optional(),
});
export type JournalLine = z.infer<typeof journalLineSchema>;

export const journalSchema = z.object({
  id: z.string(),
  journalNumber: z.string(),
  legalEntityId: z.string(),
  date: z.string(),
  source: z.string(),
  sourceId: z.string().nullable(),
  reference: z.string().nullable(),
  description: z.string(),
  status: z.string(),
  postedAt: z.string().nullable(),
  postedBy: z.string().nullable(),
  createdAt: z.string(),
  lines: z.array(journalLineSchema),
  legalEntity: z.object({ code: z.string() }).nullable().optional(),
});
export type Journal = z.infer<typeof journalSchema>;

export const journalListResponseSchema = paginatedResponseSchema(journalSchema);
export type JournalListResponse = z.infer<typeof journalListResponseSchema>;

export const createJournalLineSchema = z.object({
  accountId: z.string(),
  description: z.string().max(300).optional(),
  debit: z.number().min(0),
  credit: z.number().min(0),
  projectId: z.string().optional(),
  wbsItemId: z.string().optional(),
});

export const createJournalSchema = z.object({
  legalEntityId: z.string(),
  date: z.string().optional(),
  description: z.string().min(1).max(500),
  reference: z.string().max(100).optional(),
  lines: z.array(createJournalLineSchema).min(1),
});
export type CreateJournal = z.infer<typeof createJournalSchema>;
