import axios from 'axios';
import { configDotenv } from 'dotenv';

configDotenv();

const pagarmeApi = axios.create({
	baseURL: 'https://api.pagar.me/core/v5',
	headers: {
		'Content-Type': 'application/json',
		Authorization: `Basic ${Buffer.from(process.env.PAGARME_SECRET_KEY + ':').toString('base64')}`,
	},
});

export default pagarmeApi;
