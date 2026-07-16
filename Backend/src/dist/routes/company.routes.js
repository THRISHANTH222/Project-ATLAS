"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const company_controller_1 = require("../controllers/company.controller");
const router = (0, express_1.Router)();
/**
 * Route mapping for Company Profile Management.
 * Maps POST /company, GET /company, and PATCH /company to controller handlers.
 */
router.post('/', company_controller_1.companyController.create);
router.get('/', company_controller_1.companyController.get);
router.patch('/', company_controller_1.companyController.update);
exports.default = router;
//# sourceMappingURL=company.routes.js.map