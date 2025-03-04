import express from 'express'
import router from './providers/api/routes'
import cors from 'cors'

const app = express()
const port = 3002

app.use(cors({
  origin: process.env.FRONT_END_URL,  // Alvo do frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],  // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'],  // Cabeçalhos permitidos
  credentials: true  // Permitir o envio de cookies ou autenticação via token
}));

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello World'})
})

app.use(router);

app.listen(port, () => {
  console.log(`Started ${port}`)
})

