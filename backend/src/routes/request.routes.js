import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import upload from '../middleware/upload.middleware.js';
import {
  createRequest,
  getMyRequests,
  editRequest,
  deleteRequest,
  getRequestFile,
  getRequestComments,
  addRequestComment
} from '../controllers/request.controller.js';

const router = Router();

// Todas las rutas requieren estar logueado
router.use(requireAuth);

// Rutas para el empleado
router.post('/', upload.single('archivo'), createRequest);
router.get('/me', getMyRequests);

// Rutas para editar y eliminar (Solo pendientes)
router.put('/:id', upload.single('archivo'), editRequest);
router.delete('/:id', deleteRequest);
router.get('/file/:fileId', getRequestFile);
router.get('/:id/comments', getRequestComments);
router.post('/:id/comments', addRequestComment);

export default router;