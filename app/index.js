const express = require('express')
const { Pool } = require('pg')
const https = require('https');

const app = express()
const cors = require('cors');
app.use(cors())
require('dotenv').config()



app.get('/', (req, res)=>{
    res.send('API REST')
  })

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}/`)
);
