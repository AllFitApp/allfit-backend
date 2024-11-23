import express from 'express'
import router from './providers/api/routers'
const app = express()
const port = 3002

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.use(router);

app.listen(port, () => {
  console.log(`Example app listening on pordasdast ${port}`)
})