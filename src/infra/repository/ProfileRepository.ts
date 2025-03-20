import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class ProfileRepository {
  public async createProfileFromUser(userId: string, additionalInfo: any): Promise<any> {

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new Error('User not found');
    }

    const profileData = {
      userId: user.id,
      name: user.name,
      email: user.email,
      address: additionalInfo.address || '',
      phone: additionalInfo.phone || '',
      alunos: additionalInfo.alunos || 0,
      description: additionalInfo.description || '',
      niche: additionalInfo.niche || '',
      followers: additionalInfo.followers || 0,
      rate: additionalInfo.rate || 0,
      avatar: additionalInfo.avatar || ''
    };

    const profile = await prisma.profile.create({
      data: profileData,
    });

    return profile;
  }
}