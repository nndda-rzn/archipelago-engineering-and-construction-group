/**
 * Kontrak domain approval. Dipecah ke subdirektori `approval/` (mengikuti pola
 * `finance/`) agar tiap file fokus: task/inbox vs definisi/versi workflow.
 * Barrel ini menjaga permukaan `@aec/api-contracts` tetap sama.
 */
export * from './approval/task';
export * from './approval/workflow';
