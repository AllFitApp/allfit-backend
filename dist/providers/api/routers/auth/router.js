"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const schema_1 = require("./schema");
const router = (0, express_1.Router)();
router.post('/signUp', auth_controller_1.authController.singUp, schema_1.signUpSchema);
exports.default = router;
