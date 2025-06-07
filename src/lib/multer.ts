import multer from 'multer';
import path from 'path';

// Configuração do Multer para upload local
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
		cb(null, path.resolve(__dirname, '..', 'uploads'));
	},
	filename: (req, file, cb) => {
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		const extension = path.extname(file.originalname);
		cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
	},
});

export const upload = multer({ storage });
