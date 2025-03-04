import { celebrate, Joi, Segments } from "celebrate";

const emailRegex = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  );
  const passwordRegex = new RegExp(/^((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,128})$/);
  

const usernameEmailSchema = Joi.string().required().regex(emailRegex);

export const joiSignUpSchema = Joi.object().keys({
    "username": "vitor",
    "email": "vitor@teste.com",
    "password": "Vitor@123",
    "name": "Vitor Teste",
    "role": "ADMIN",
    "number": "4999999999"
});

export const signUpSchema = celebrate({ [Segments.BODY]: joiSignUpSchema });
