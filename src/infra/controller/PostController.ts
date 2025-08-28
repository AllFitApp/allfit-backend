// src/controllers/PostController.ts
import { supabase } from '@/lib/supabase';
import { PrismaClient } from '@prisma/client';
import { Request, Response } from 'express';
import path from 'path';

const prisma = new PrismaClient();

export default class PostController {
	static async createPost(req: Request, res: Response): Promise<void> {
		try {
			const { profileId, caption, mediaType } = req.body;
			if (!req.file) {
				console.error('Nenhuma imagem enviada');
				res.status(400).json({ message: 'Nenhuma imagem enviada' });
				return;
			}

			const fileExt = path.extname(req.file.originalname);
			const fileName = `post-${Date.now()}${fileExt}`;
			const filePath = fileName;

			const { data: uploadData, error: uploadError } = await supabase.storage
				.from('post-images')
				.upload(filePath, req.file.buffer, {
					contentType: req.file.mimetype,
					upsert: false,
				});

			if (uploadError) {
				console.error('Erro no upload para Supabase:', uploadError);
				res.status(500).json({ message: 'Erro ao enviar imagem' });
				return;
			}

			const { data: publicData } = supabase.storage.from('post-images').getPublicUrl(uploadData.path);

			if (!publicData?.publicUrl) {
				console.error('URL pública não retornada');
				res.status(500).json({ message: 'Não foi possível obter URL da imagem' });
				return;
			}

			const mediaUrl = publicData.publicUrl;
			console.log('URL da imagem enviada:', mediaUrl);

			const post = await prisma.post.create({
				data: {
					caption,
					mediaUrl,
					mediaType,
					profile: { connect: { id: profileId } },
				},
			});

			res.status(201).json(post);
			return;
		} catch (err) {
			console.error(err);
			if (!res.headersSent) {
				res.status(500).json({ message: 'Error creating post', err });
			}
			return;
		}
	}

	static async getPostsByProfile(req: Request, res: Response): Promise<void> {
		try {
			const { username } = req.params;

			const profile = await prisma.profile.findUnique({
				where: { username },
				include: {
					posts: {
						orderBy: { createdAt: 'desc' },
						include: {
							likes: { select: { userId: true } },
							profile: { select: { username: true, name: true, avatar: true, } },
						},
					},
				},
			});

			if (!profile) {
				res.status(404).json({ message: 'Profile not found' });
				return;
			}
			res.status(200).json(profile.posts);
		} catch (err) {
			res.status(500).json({ message: 'Error fetching posts', err });
		}
	}

	static async deletePost(req: Request, res: Response): Promise<void> {
		try {
			const { postId } = req.params;

			await prisma.post.delete({ where: { id: postId } });

			res.status(200).json({ message: 'Post deleted' });
		} catch (err) {
			res.status(500).json({ message: 'Error deleting post', err });
		}
	}

	static async likePost(req: Request, res: Response): Promise<void> {
		try {
			const { postId } = req.params;
			const userId = (req as any).userId; // pressupõe middleware auth que seta req.userId

			// Verifica se já curtiu
			const existingLike = await prisma.postLike.findUnique({
				where: { userId_postId: { userId, postId } },
			});

			if (existingLike) {
				res.status(400).json({ message: 'Post already liked by this user' });
				return;
			}

			await prisma.postLike.create({
				data: { user: { connect: { id: userId } }, post: { connect: { id: postId } } },
			});

			res.status(200).json({ message: 'Post liked' });
		} catch (err) {
			res.status(500).json({ message: 'Error liking post', err });
		}
	}

	static async unlikePost(req: Request, res: Response): Promise<void> {
		try {
			const { postId } = req.params;
			const userId = (req as any).userId;

			const deleted = await prisma.postLike.delete({
				where: { userId_postId: { userId, postId } },
			});

			res.status(200).json({ message: 'Post unliked' });
		} catch (err) {
			res.status(500).json({ message: 'Error unliking post', err });
		}
	}
}
