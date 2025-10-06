import { supabase } from '@/lib/supabase';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { Request, Response } from 'express';

import path from 'path';

const prisma = new PrismaClient();

interface CreatePartnerGymRequest {
	name: string;
	street: string;
	streetNumber: string;
	neighborhood: string;
	city: string;
	state: string;
	zipCode: string;
	complementary?: string;
	availableServices: string[];
	contactPhone?: string;
	contactEmail?: string;
	contactWebsite?: string;
	photoUrl?: string;
}

interface UpdatePartnerGymRequest {
	name?: string;
	street?: string;
	streetNumber?: string;
	neighborhood?: string;
	city?: string;
	state?: string;
	zipCode?: string;
	complementary?: string;
	availableServices?: string[];
	contactPhone?: string;
	contactEmail?: string;
	contactWebsite?: string;
	photoUrl?: string;
	isActive?: boolean;
}

interface GetAllPartnersQuery {
	city?: string;
	state?: string;
	page?: string;
	limit?: string;
	search?: string;
}

interface GetNearbyQuery {
	city: string;
	state: string;
	limit?: string;
}

interface GetByServicesQuery {
	services: string;
}

interface PaginationResponse {
	page: number;
	limit: number;
	total: number;
	pages: number;
}

interface ApiResponse<T = any> {
	message?: string;
	data?: T;
	error?: string;
	pagination?: PaginationResponse;
	total?: number;
	searchedServices?: string[];
}

export default class PartnerGymController {
	// Criar nova academia parceira
	static async create(req: Request, res: Response<ApiResponse>): Promise<Response> {
		try {
			const {
				name,
				street,
				streetNumber,
				neighborhood,
				city,
				state,
				zipCode,
				complementary,
				availableServices,
				contactPhone,
				contactEmail,
				contactWebsite,
			} = req.body;

			// validações básicas
			if (!name || !street || !streetNumber || !neighborhood || !city || !state || !zipCode) {
				return res.status(400).json({
					error: 'Campos obrigatórios: name, street, streetNumber, neighborhood, city, state, zipCode',
				});
			}

			const photoUrl = await uploadGymImage(req.file);

			const partnerGym = await prisma.partnerGym.create({
				data: {
					name,
					street,
					streetNumber,
					neighborhood,
					city,
					state: state.toUpperCase(),
					zipCode: zipCode.replace(/\D/g, ''),
					complementary,
					availableServices: Array.isArray(availableServices) ? availableServices : [],
					contactPhone,
					contactEmail,
					contactWebsite,
					photoUrl,
				},
			});

			return res.status(201).json({
				message: 'Academia parceira criada com sucesso',
				data: partnerGym,
			});
		} catch (error) {
			console.error('Erro ao criar academia parceira:', error);
			return res.status(500).json({ error: 'Erro interno do servidor' });
		}
	}

	// Listar todas as academias parceiras ativas
	static async getAll(
		req: Request<{}, ApiResponse, {}, GetAllPartnersQuery>,
		res: Response<ApiResponse>
	): Promise<Response> {
		try {
			const { city, state, page = '1', limit = '10', search } = req.query;

			const skip = (parseInt(page) - 1) * parseInt(limit);
			const take = parseInt(limit);

			// Construir filtros
			const where: any = {
				isActive: true,
			};

			if (city) {
				where.city = {
					contains: city,
					mode: 'insensitive',
				};
			}

			if (state) {
				where.state = state.toUpperCase();
			}

			if (search) {
				where.name = {
					contains: search,
					mode: 'insensitive',
				};
			}

			const [partnerGyms, total] = await Promise.all([
				prisma.partnerGym.findMany({
					where,
					skip,
					take,
					orderBy: {
						name: 'asc',
					},
				}),
				prisma.partnerGym.count({ where }),
			]);

			return res.status(200).json({
				data: partnerGyms,
				pagination: {
					page: parseInt(page),
					limit: take,
					total,
					pages: Math.ceil(total / take),
				},
			});
		} catch (error) {
			console.error('Erro ao buscar academias parceiras:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Buscar academia por ID
	static async getById(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<Response> {
		try {
			const { id } = req.params;

			const partnerGym = await prisma.partnerGym.findUnique({
				where: { id },
			});

			if (!partnerGym) {
				return res.status(404).json({
					error: 'Academia parceira não encontrada',
				});
			}

			return res.status(200).json({
				data: partnerGym,
			});
		} catch (error) {
			console.error('Erro ao buscar academia parceira:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Atualizar academia parceira
	static async update(
		req: Request<{ id: string }, ApiResponse, UpdatePartnerGymRequest>,
		res: Response<ApiResponse>
	): Promise<Response> {
		try {
			const { id } = req.params;
			const updateData = req.body;

			// Verificar se a academia existe
			const existingGym = await prisma.partnerGym.findUnique({
				where: { id },
			});

			if (!existingGym) {
				return res.status(404).json({
					error: 'Academia parceira não encontrada',
				});
			}

			// Validar availableServices se fornecido
			if (updateData.availableServices && !Array.isArray(updateData.availableServices)) {
				return res.status(400).json({
					error: 'availableServices deve ser um array',
				});
			}

			// Normalizar dados se necessário
			if (updateData.state) {
				updateData.state = updateData.state.toUpperCase();
			}

			if (updateData.zipCode) {
				updateData.zipCode = updateData.zipCode.replace(/\D/g, '');
			}

			const partnerGym = await prisma.partnerGym.update({
				where: { id },
				data: updateData,
			});

			return res.status(200).json({
				message: 'Academia parceira atualizada com sucesso',
				data: partnerGym,
			});
		} catch (error) {
			console.error('Erro ao atualizar academia parceira:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Desativar academia parceira (soft delete)
	static async deactivate(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<Response> {
		try {
			const { id } = req.params;

			const partnerGym = await prisma.partnerGym.findUnique({
				where: { id },
			});

			if (!partnerGym) {
				return res.status(404).json({
					error: 'Academia parceira não encontrada',
				});
			}

			const updatedGym = await prisma.partnerGym.update({
				where: { id },
				data: { isActive: false },
			});

			return res.status(200).json({
				message: 'Academia parceira desativada com sucesso',
				data: updatedGym,
			});
		} catch (error) {
			console.error('Erro ao desativar academia parceira:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Reativar academia parceira
	static async activate(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<Response> {
		try {
			const { id } = req.params;

			const partnerGym = await prisma.partnerGym.findUnique({
				where: { id },
			});

			if (!partnerGym) {
				return res.status(404).json({
					error: 'Academia parceira não encontrada',
				});
			}

			const updatedGym = await prisma.partnerGym.update({
				where: { id },
				data: { isActive: true },
			});

			return res.status(200).json({
				message: 'Academia parceira reativada com sucesso',
				data: updatedGym,
			});
		} catch (error) {
			console.error('Erro ao reativar academia parceira:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Deletar permanentemente (apenas para admins)
	static async delete(req: Request<{ id: string }>, res: Response<ApiResponse>): Promise<Response> {
		try {
			const { id } = req.params;

			const partnerGym = await prisma.partnerGym.findUnique({
				where: { id },
			});

			if (!partnerGym) {
				return res.status(404).json({
					error: 'Academia parceira não encontrada',
				});
			}

			await prisma.partnerGym.delete({
				where: { id },
			});

			return res.status(200).json({
				message: 'Academia parceira deletada permanentemente',
			});
		} catch (error) {
			console.error('Erro ao deletar academia parceira:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Buscar academias próximas por CEP ou coordenadas
	static async getNearby(
		req: Request<{}, ApiResponse, {}, GetNearbyQuery>,
		res: Response<ApiResponse>
	): Promise<Response> {
		try {
			const { city, state, limit = '10' } = req.query;

			if (!city || !state) {
				return res.status(400).json({
					error: 'Parâmetros city e state são obrigatórios',
				});
			}

			const partnerGyms = await prisma.partnerGym.findMany({
				where: {
					isActive: true,
					city: {
						contains: city,
						mode: 'insensitive',
					},
					state: state.toUpperCase(),
				},
				take: parseInt(limit),
				orderBy: {
					name: 'asc',
				},
			});

			return res.status(200).json({
				data: partnerGyms,
				total: partnerGyms.length,
			});
		} catch (error) {
			console.error('Erro ao buscar academias próximas:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}

	// Buscar por serviços específicos
	static async getByServices(
		req: Request<{}, ApiResponse, {}, GetByServicesQuery>,
		res: Response<ApiResponse>
	): Promise<Response> {
		try {
			const { services } = req.query;

			if (!services) {
				return res.status(400).json({
					error: 'Parâmetro services é obrigatório',
				});
			}

			const servicesList = services.split(',').map((s) => s.trim());

			// Usar raw query para buscar em campo JSON
			const partnerGyms = await prisma.$queryRaw<any[]>`
        SELECT * FROM partner_gyms 
        WHERE is_active = true 
        AND available_services::jsonb ?| ARRAY[${servicesList.join(',')}]::text[]
        ORDER BY name ASC
      `;

			return res.status(200).json({
				data: partnerGyms,
				total: partnerGyms.length,
				searchedServices: servicesList,
			});
		} catch (error) {
			console.error('Erro ao buscar por serviços:', error);
			return res.status(500).json({
				error: 'Erro interno do servidor',
			});
		}
	}
}

// Função utilitária para salvar no Supabase
async function uploadGymImage(file: Express.Multer.File | undefined) {
	if (!file) throw new Error('Imagem obrigatória');
	if (file.size > 10 * 1024 * 1024) throw new Error('Imagem excede 10mb');

	const fileExt = path.extname(file.originalname);
	const fileName = `partner-gym-${dayjs().format('YYYYMMDD-HHmmss')}${fileExt}`;

	const { data: uploadData, error: uploadError } = await supabase.storage
		.from('partner-gyms')
		.upload(fileName, file.buffer, {
			contentType: file.mimetype,
			upsert: true,
		});

	if (uploadError) throw new Error('Erro ao enviar imagem');

	const { data: publicData } = supabase.storage.from('partner-gyms').getPublicUrl(uploadData.path);

	if (!publicData?.publicUrl) throw new Error('Não foi possível obter URL da imagem');

	return publicData.publicUrl;
}
