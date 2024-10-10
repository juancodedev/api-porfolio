require("dotenv").config();

const express = require("express");
const { Pool } = require("pg");
const https = require("https");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
const cors = require("cors");
app.use(cors());
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.STRING_DB,
});

app.use(express.json());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send("API REST");
});

app.get("/sql", async (request, response) => {
  // const resultadoSQL = await sql<Contact>`SELECT * FROM contacts`;
  const resultadoSQL = await pool.query("SELECT * FROM contacts");
  console.log(resultadoSQL.rows);

  response.send(JSON.stringify(resultadoSQL.rows));
});

app.post("/sql/agregar", async (req, res) => {
  const result = {
    status: "",
    message: "",
    data: "",
  };
  const {
    first_name,
    last_name,
    email_address,
    phone_number,
    services,
    message,
  } = req.body;
  // console.log('body: ', req.body)

  const dateNow = new Date();
  try {
    const resultadoSQL = await pool.query(
      "INSERT INTO contacts (first_name,last_name, email_address,phone_number, services, message, created_at, update_at) VALUES ($1, $2, $3, $4, $5, $6, $7,$8) RETURNING *",
      [
        first_name,
        last_name,
        email_address,
        phone_number,
        services,
        message,
        dateNow,
        dateNow,
      ]
    );
    // console.log(JSON.stringify(resultadoSQL.rows))
    res.status(201);

    result.data = resultadoSQL.rows[0];
    result.status = res.statusCode;
    result.message = "Registro agregado correctamente";
    console.log(result);

    res.send(JSON.stringify(result));
    res.end();
  } catch (error) {
    res.status(500);
    result.data = req.body;
    result.status = res.statusCode;
    result.message = "Error al agregar el registro, registro ya existe";
    res.send(JSON.stringify(result));
    res.end();
  }
});

app.post("/webhook", async(req,res) =>{
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));
  // check if the webhook request contains a message
  // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
  const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
  // check if the incoming message contains text
  if (message?.type === "text") {
    // extract the business number to send the reply from it
    const business_phone_number_id =
      req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    // send a reply message as per the docs here https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        to: message.from,
        text: { body: "Echo: " + message.text.body },
        context: {
          message_id: message.id, // shows the message as a reply to the original user message
        },
      },
    });

    // mark incoming message as read
    await axios({
      method: "POST",
      url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${GRAPH_API_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id,
      },
    });
  }

  res.sendStatus(200);
} )

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}/`)
);

// // Configurar cabeceras para autenticar la API de WhatsApp
// const headers = {
//   'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
//   'Content-Type': 'application/json'
// };

// // Endpoint para recibir mensajes
// app.post('/webhook', (req, res) => {
//   const { entry } = req.body;

//   // Verifica si la solicitud tiene mensajes
//   if (entry && entry.length > 0 && entry[0].changes && entry[0].changes[0].value.messages) {
//     const messages = entry[0].changes[0].value.messages;
//     const message = messages[0];
//     const from = message.from; // Número de WhatsApp del remitente
//     const text = message.text.body; // Texto del mensaje recibido

//     console.log(`Mensaje recibido de ${from}: ${text}`);

//     // Responder al mensaje
//     const responseMessage = `Recibido: ${text}`;
//     sendMessage(from, responseMessage);
//   }

//   res.sendStatus(200);
// });

// // Función para enviar mensajes
// const sendMessage = (to, message) => {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: to,
//     text: { body: message },
//   };

//   axios.post(`${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`, data, { headers })
//     .then(response => console.log('Mensaje enviado:', response.data))
//     .catch(error => console.error('Error enviando mensaje:', error.response ? error.response.data : error.message));
// };

// // Endpoint para verificar el webhook
// app.get('/webhook', (req, res) => {
//   const verifyToken = "your_verify_token"; // Define un token de verificación
//   const { mode, token, challenge } = req.query;

//   if (mode === "subscribe" && token === verifyToken) {
//     res.status(200).send(challenge);
//   } else {
//     res.sendStatus(403);
//   }
// });
// // Configurar cabeceras para autenticar la API de WhatsApp
// const headers = {
//   'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
//   'Content-Type': 'application/json'
// };

// // Endpoint para recibir mensajes
// app.post('/webhook', (req, res) => {
//   const { entry } = req.body;

//   // Verifica si la solicitud tiene mensajes
//   if (entry && entry.length > 0 && entry[0].changes && entry[0].changes[0].value.messages) {
//     const messages = entry[0].changes[0].value.messages;
//     const message = messages[0];
//     const from = message.from; // Número de WhatsApp del remitente
//     const text = message.text.body; // Texto del mensaje recibido

//     console.log(`Mensaje recibido de ${from}: ${text}`);

//     // Responder al mensaje
//     const responseMessage = `Recibido: ${text}`;
//     sendMessage(from, responseMessage);
//   }

//   res.sendStatus(200);
// });

// // Función para enviar mensajes
// const sendMessage = (to, message) => {
//   const data = {
//     messaging_product: 'whatsapp',
//     to: to,
//     text: { body: message },
//   };

//   axios.post(`${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`, data, { headers })
//     .then(response => console.log('Mensaje enviado:', response.data))
//     .catch(error => console.error('Error enviando mensaje:', error.response ? error.response.data : error.message));
// };

// // Endpoint para verificar el webhook
// app.get('/webhook', (req, res) => {
//   const verifyToken = "your_verify_token"; // Define un token de verificación
//   const { mode, token, challenge } = req.query;

//   if (mode === "subscribe" && token === verifyToken) {
//     res.status(200).send(challenge);
//   } else {
//     res.sendStatus(403);
//   }
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en http://localhost:${PORT}`);
// });

// const PORT = process.env.PORT || 3000;
// app.listen(PORT, () => {
//   console.log(`Servidor corriendo en http://localhost:${PORT}`);
// });
