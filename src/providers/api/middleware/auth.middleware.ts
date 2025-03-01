import express, { Request, Response, NextFunction } from 'express';

export const parseJsonBody = (req: Request, res: Response, next: NextFunction) => {
    express.json()(req, res, next);
};