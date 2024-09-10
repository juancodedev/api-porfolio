const express = require("express");
const { Pool } = require("pg");
const https = require("https");

const app = express();
const cors = require("cors");
app.use(cors());
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.STRING_DB,
});

app.use(express.json());

app.get("/", (req, res) => {
  res.send("API REST");
});

app.get('/sql', async (request, response)=>{

  // const resultadoSQL = await sql<Contact>`SELECT * FROM contacts`;
  const resultadoSQL = await pool.query('SELECT * FROM contacts')
  console.log(resultadoSQL.rows)

  response.send(JSON.stringify(resultadoSQL.rows))

})

app.post('/sql/agregar', async (req, res)=>{
  const result = {
    status: '',
    message: '',
    data : '',
  }
  const {first_name,last_name, email_address,phone_number, services, message} = req.body;
  // console.log('body: ', req.body)

  const dateNow = new Date();
  try {
    const resultadoSQL = await pool.query(
      'INSERT INTO contacts (first_name,last_name, email_address,phone_number, services, message, created_at, update_at) VALUES ($1, $2, $3, $4, $5, $6, $7,$8) RETURNING *', 
      [first_name,last_name, email_address,phone_number, services, message, dateNow, dateNow])
    // console.log(JSON.stringify(resultadoSQL.rows))
    res.status(201)
      
    result.data = resultadoSQL.rows[0]
    result.status = res.statusCode
    result.message = 'Registro agregado correctamente'
    console.log(result)


    res.send(JSON.stringify(result))
    res.end()

  } catch (error) {
    res.status(500)
    result.data = req.body
    result.status = res.statusCode
    result.message = 'Error al agregar el registro, registro ya existe'
    res.send(JSON.stringify(result))
    res.end()
  }

})




const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}/`)
);
