import express from 'express'
import router from './providers/api/routes'
import cors from 'cors'

const app = express()
const port = 3002


const corsOptions = {
  origin: '*', // Permite múltiplas origens
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello World'})
})

app.use(router);

app.listen(port, () => {
  console.log(`Started ${port}`)
})

