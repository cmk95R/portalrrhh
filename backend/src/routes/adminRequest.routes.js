import { Router } from 'express';
import upload from '../middleware/upload.middleware.js';
import { 
  getAllRequests, 
  updateRequestStatus,
  adminUpdateRequest,
  adminDeleteRequest,
  sendRequestReminder,
  getAdminRequestComments,
  addAdminRequestComment,
  adminCreateRequest
} from '../controllers/request.controller.js';

const router = Router();

router.get('/', getAllRequests);
router.post('/', upload.single('archivo'), adminCreateRequest);
router.patch('/:id/status', upload.single('archivo'), updateRequestStatus);
// Permite que RRHH adjunte/reemplace documentos al editar una solicitud
router.put('/:id', upload.single('archivo'), adminUpdateRequest);
router.delete('/:id', adminDeleteRequest);
router.post('/:id/send-reminder', sendRequestReminder);
router.get('/:id/comments', getAdminRequestComments);
router.post('/:id/comments', addAdminRequestComment);

export default router;