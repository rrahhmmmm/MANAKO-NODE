import { createReadStream } from 'node:fs';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import {
  listPrPoQuerySchema,
  updateInitDocumentSchema,
  uploadContractSchema,
  uploadInitDocumentSchema,
} from './schema.js';
import * as initDocumentsService from './service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; code?: string; message: string };
  return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
}

// Mount di /api/v1 tanpa prefix — path mixed: /projects/:id/init-documents, /init-documents/:id,
// /projects/:id/pr-po-docs, /projects/:id/contract
export async function initDocumentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // ── Init Documents ──────────────────────────────────────────────
  app.get('/projects/:id/init-documents', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      return ok(await initDocumentsService.list(id));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/projects/:id/pr-po-docs', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = listPrPoQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Query invalid', parsed.error.flatten()));
    try {
      return ok(await initDocumentsService.listPrPo(id, parsed.data.doc_type));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/projects/:id/init-documents', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));

    const data = await req.file();
    if (!data) return reply.code(400).send(fail('BAD_REQUEST', 'File wajib diupload'));

    const parsed = uploadInitDocumentSchema.safeParse({
      doc_type: (data.fields.doc_type as { value?: string } | undefined)?.value,
      no_document: (data.fields.no_document as { value?: string } | undefined)?.value,
      doc_name: (data.fields.doc_name as { value?: string } | undefined)?.value,
      termin_ids: (data.fields.termin_ids as { value?: string } | undefined)?.value,
    });
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));

    try {
      const result = await initDocumentsService.upload(id, parsed.data.doc_type, data.file, data.filename, {
        no_document: parsed.data.no_document,
        doc_name: parsed.data.doc_name,
        termin_ids: parsed.data.termin_ids,
      });
      return reply.code(201).send(ok(result));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.patch('/init-documents/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateInitDocumentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const result = await initDocumentsService.update(id, parsed.data);
      return ok(result);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.delete('/init-documents/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await initDocumentsService.remove(id);
      return ok(result);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/init-documents/:id/file', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const { absolutePath, contentType, filename } = await initDocumentsService.getFile(id);
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.type(contentType).send(createReadStream(absolutePath));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── Kontrak ─────────────────────────────────────────────────────
  app.post('/projects/:id/contract', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));

    const data = await req.file();
    if (!data) return reply.code(400).send(fail('BAD_REQUEST', 'File wajib diupload'));

    const parsed = uploadContractSchema.safeParse({
      no_kontrak: (data.fields.no_kontrak as { value?: string } | undefined)?.value,
    });
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));

    try {
      const result = await initDocumentsService.uploadContract(id, data.file, data.filename, parsed.data.no_kontrak);
      return reply.code(201).send(ok(result));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.delete('/projects/:id/contract', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await initDocumentsService.removeContract(id);
      return ok(result);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/projects/:id/contract/file', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const { absolutePath, contentType, filename } = await initDocumentsService.getContractFile(id);
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.type(contentType).send(createReadStream(absolutePath));
    } catch (err) {
      return handleError(err, reply);
    }
  });
}
