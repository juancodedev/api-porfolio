const express = require('express')
const { Pool } = require('pg')
const https = require('https');
const app = express();

const port = process.env.PORT || 3001;

app.get('/', (req, res)=>{
    res.send('API REST')
  })

app.listen(port, () => {
  console.log(`port runing in http://localhost:${port}`);
});
