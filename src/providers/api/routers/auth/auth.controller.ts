import { NextFunction, Request, Response } from 'express';
import { sign } from 'jsonwebtoken';
import { compare } from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const signIn =  async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { email, password } = req.body;
        const result = email + password;
      
        res.status(200).json(result);
        next();
    } catch (err) {
      next(err);
    }
  };

export const authController = {
    signIn
};