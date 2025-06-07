import cors from 'cors';
import express from 'express';
import path from 'path';
import router from './providers/api/routes';

const app = express();
const port = 3002;

const corsOptions = {
	origin: '*', // Permite múltiplas origens
	methods: ['GET', 'POST', 'PUT', 'DELETE'],
	allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use('/uploads', express.static(path.resolve(__dirname, 'uploads')));
app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
	res.status(200).json({ message: 'Hello World' });
});

app.use(router);

app.listen(port, () => {
	console.log(`Started ${port}`);
});
