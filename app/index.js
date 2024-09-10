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
const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}/`)
);
