import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default class ProfileController {

  static async getUserById(req: Request, res: Response): Promise<void> {
    console.log('GET USER BY ID', req.params);
    try {
      const { id } = req.params;

      // Verifica se o perfil existe
      const profile = await prisma.profile.findUnique({ where: { userId: id } });

      if (!profile) {
        // Se não houver perfil, buscar informações básicas do usuário
        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
          res.status(404).json({ message: 'User not found' });
          return;
        }

        res.status(200).json({
          firstAccess: true,
          name: user.name,
          alunos: 0,
          description: '',
          niche: '',
          followers: 0,
          rate: 0,
          avatar: '',

        });
        return;
      }

      res.status(200).json({ profile });
    } catch (err) {
      res.status(500).json({ message: 'Error fetching profile', err });
    }
  }

  static async createProfile(req: Request, res: Response): Promise<void> {
    try {
      console.log('CREATE PROFILE', req.body);
      const { id } = req.params;
      const profileData = req.body;

      const profile = await prisma.profile.create({
        data: {
          userId: id,
          ...profileData,
        },
      });

      res.status(201).json({ profile });
    }	catch (err) {
      res.status(500).json({ message: 'Error creating profile', err });
    }
  }


  // Novo método para atualizar o perfil do usuário
  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const profile = await prisma.profile.upsert({
        where: { userId: id },
        update: updateData,
        create: { userId: id, ...updateData },
      });

      res.status(200).json({ profile });
    } catch (err) {
      res.status(500).json({ message: 'Error updating profile', err });
    }
  }
}
