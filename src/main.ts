import express from 'express'
import router from './providers/api/routes'
import cors from 'cors'

const app = express()
const port = 3002


const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'], 
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.options('*', cors(corsOptions));




app.get('/', (req, res) => {
  res.status(200).json({ message: 'Hello World'})
})

app.use(router);

app.listen(port, () => {
  console.log(`Started ${port}`)
})

