"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signInSchema = exports.joiSignInSchema = void 0;
const celebrate_1 = require("celebrate");
const emailRegex = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);
const passwordRegex = new RegExp(/^((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,128})$/);
const usernameEmailSchema = celebrate_1.Joi.string().required().regex(emailRegex);
exports.joiSignInSchema = celebrate_1.Joi.object().keys({
    username: celebrate_1.Joi.alternatives().try(usernameEmailSchema),
    password: celebrate_1.Joi.string().required().regex(passwordRegex)
});
exports.signInSchema = (0, celebrate_1.celebrate)({ [celebrate_1.Segments.BODY]: exports.joiSignInSchema });
