import express, { NextFunction, Request, Response } from 'express';
// import { verify } from 'jsonwebtoken';

// const tokenSecret = process.env.SECRET as string;

export const parseJsonBody = (req: Request, res: Response, next: NextFunction) => {
	express.json()(req, res, next);
};

// export function authMiddleware(req: Request, res: Response, next: NextFunction) {
//   const authHeader = req.headers.authorization;
//   if (!authHeader) {
//     return res.status(401).json({ message: 'Token missing' });
//   }
//   const [_, token] = authHeader.split(' ');
//   try {
//     const decoded = verify(token, tokenSecret) as { id: string };
//     (req as any).userId = decoded.id;
//     return next();
//   } catch {
//     return res.status(401).json({ message: 'Invalid token' });
//   }
// }
