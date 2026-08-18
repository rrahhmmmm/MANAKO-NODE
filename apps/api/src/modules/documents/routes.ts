import { createReadStream } from 'node:fs';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { authGuard, requireRole } from '../../middleware/auth.js';
import { fail, ok } from '../../lib/response.js';
import { createRequirementSchema, updateRequirementSchema, updateTerminDocumentSchema, uploadTerminDocumentSchema } from './schema.js';
import * as requirementsService from './requirements.service.js';
import * as terminDocumentsService from './termin-documents.service.js';

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) ? id : null;
}

function handleError(err: unknown, reply: FastifyReply) {
  const e = err as { statusCode?: number; code?: string; message: string };
  return reply.code(e.statusCode ?? 500).send(fail(e.code ?? 'INTERNAL', e.message));
}

// Mount di /api/v1 tanpa prefix — path mixed: /termins/:id/requirements, /termins/:id/documents, /termin-documents/:id
export async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  // ── Document Requirements ──────────────────────────────────────
  app.get('/termins/:id/requirements', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      return ok(await requirementsService.listRequirements(id));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/termins/:id/requirements', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = createRequirementSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const requirement = await requirementsService.createRequirement(id, parsed.data);
      return reply.code(201).send(ok(requirement));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.patch('/termins/:id/requirements/:docType', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const { docType } = req.params as { docType: string };
    const parsed = updateRequirementSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const requirement = await requirementsService.updateRequirement(id, docType, parsed.data);
      return ok(requirement);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.delete('/termins/:id/requirements/:docType', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const { docType } = req.params as { docType: string };
    try {
      const result = await requirementsService.removeRequirement(id, docType);
      return ok(result);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  // ── Termin Documents ────────────────────────────────────────────
  app.get('/termins/:id/documents', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      return ok(await terminDocumentsService.listChecklist(id));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.post('/termins/:id/documents', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));

    const data = await req.file();
    if (!data) return reply.code(400).send(fail('BAD_REQUEST', 'File wajib diupload'));

    const parsed = uploadTerminDocumentSchema.safeParse({
      doc_type: (data.fields.doc_type as { value?: string } | undefined)?.value,
      custom_label: (data.fields.custom_label as { value?: string } | undefined)?.value,
    });
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));

    try {
      const result = await terminDocumentsService.upload(
        id,
        parsed.data.doc_type,
        data.file,
        data.filename,
        parsed.data.custom_label,
      );
      return reply.code(201).send(ok(result));
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.patch('/termin-documents/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    const parsed = updateTerminDocumentSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send(fail('BAD_REQUEST', 'Body invalid', parsed.error.flatten()));
    try {
      const result = await terminDocumentsService.updateStatus(id, parsed.data);
      return ok(result);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.delete('/termin-documents/:id', { preHandler: requireRole('admin') }, async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const result = await terminDocumentsService.remove(id);
      return ok(result);
    } catch (err) {
      return handleError(err, reply);
    }
  });

  app.get('/termin-documents/:id/file', async (req, reply) => {
    const id = parseId((req.params as { id: string }).id);
    if (id === null) return reply.code(400).send(fail('BAD_REQUEST', 'ID invalid'));
    try {
      const { absolutePath, contentType, filename } = await terminDocumentsService.getFile(id);
      reply.header('Content-Disposition', `inline; filename="${filename}"`);
      return reply.type(contentType).send(createReadStream(absolutePath));
    } catch (err) {
      return handleError(err, reply);
    }
  });
}
