"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signUpSchema = exports.joiSignUpSchema = void 0;
const celebrate_1 = require("celebrate");
const emailRegex = new RegExp(/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/);
const passwordRegex = new RegExp(/^((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,128})$/);
const usernameEmailSchema = celebrate_1.Joi.string().required().regex(emailRegex);
exports.joiSignUpSchema = celebrate_1.Joi.object().keys({
    username: celebrate_1.Joi.alternatives().try(usernameEmailSchema),
    password: celebrate_1.Joi.string().required().regex(passwordRegex),
    name: celebrate_1.Joi.string().required(),
    role: celebrate_1.Joi.string().required(),
    number: celebrate_1.Joi.string().required(),
    userName: celebrate_1.Joi.string().required(),
});
exports.signUpSchema = (0, celebrate_1.celebrate)({ [celebrate_1.Segments.BODY]: exports.joiSignUpSchema });
