import multer from 'multer';

// configura o multer para armazenar o arquivo em memória
const storage = multer.memoryStorage();
export const upload = multer({ storage });
