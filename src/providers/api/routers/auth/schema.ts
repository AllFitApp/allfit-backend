import { celebrate, Joi, Segments } from "celebrate";

const emailRegex = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  );
  const passwordRegex = new RegExp(/^((?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,128})$/);
  

const usernameEmailSchema = Joi.string().required().regex(emailRegex);

export const joiSignInSchema = Joi.object().keys({
    username: Joi.alternatives().try(usernameEmailSchema),
    password: Joi.string().required().regex(passwordRegex)
});

export const signInSchema = celebrate({ [Segments.BODY]: joiSignInSchema });
