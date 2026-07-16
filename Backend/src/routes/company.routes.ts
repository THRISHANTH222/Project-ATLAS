import { Router } from 'express';
import { companyController } from '../controllers/company.controller';

const router = Router();

/**
 * Route mapping for Company Profile Management.
 * Maps POST /company, GET /company, and PATCH /company to controller handlers.
 */
router.post('/', companyController.create);
router.get('/', companyController.get);
router.patch('/', companyController.update);

export default router;
