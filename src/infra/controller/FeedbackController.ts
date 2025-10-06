import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class FeedbackController {
  static async create(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        email,
        experience,
        liked,
        disliked,
        bug,
        navigation,
        recommend,
        suggestion,
        features,
        usability
      } = req.body;

      const feedback = await prisma.feedback.create({
        data: {
          name,
          email,
          experience,
          liked,
          disliked,
          bug,
          navigation,
          recommend,
          suggestion,
          features,
          usability
        }
      });

      res.status(201).json({ message: 'Feedback enviado com sucesso', feedback });
    } catch (err) {
      res.status(500).json({ message: 'Erro ao enviar feedback', err });
    }
  }
}