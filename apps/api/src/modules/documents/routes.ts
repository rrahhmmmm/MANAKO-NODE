import type { FastifyInstance } from 'fastify';
import { authGuard } from '../../middleware/auth.js';
import { ok } from '../../lib/response.js';

// Placeholder — akan diisi upload termin docs, init docs, requirements, dll.
export async function documentsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);

  app.get('/health', async () => ok({ module: 'documents', status: 'todo' }));

  // TODO:
  //  - GET  /termins/:id/documents
  //  - POST /termins/:id/documents (multipart)
  //  - PATCH /termin-documents/:id
  //  - DELETE /termin-documents/:id
  //  - GET  /projects/:id/init-documents
  //  - POST /projects/:id/init-documents (multipart)
  //  - PATCH /init-documents/:id
  //  - DELETE /init-documents/:id
  //  - GET  /projects/:id/pr-po-docs
  //  - GET  /termins/:id/requirements
  //  - POST /termins/:id/requirements
  //  - PATCH /termins/:id/requirements/:doc_type
  //  - DELETE /termins/:id/requirements/:doc_type
}
