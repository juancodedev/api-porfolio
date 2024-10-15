const express = require("express");
const { Pool } = require("pg");
const bodyParser = require("body-parser");
const axios = require("axios").default;

const app = express();
const cors = require("cors");
app.use(cors());
require("dotenv").config();

function sendMessageWsp(params) {
  const recipientNumber = process.env.NUMBER; // Puedes cambiarlo a req.body.to si se recibe dinámicamente
  const accessToken = process.env.GRAPH_API_TOKEN; //process.env.GRAPH_API_TOKEN; // Asegúrate de tener el token en tu .env
  const url = process.env.URL;
  // const { Message, Email, firstName, LastName, Phone, Service } = params
  const {
    message,
    email_address,
    first_name,
    last_name,
    phone_number,
    services,
  } = params;

  const messageWsp = `Tienes un mensaje de ${first_name} ${last_name}
con el correo: ${email_address}
Teléfono: ${phone_number}
Servicio: *${services}*

Mensaje: ${message}`; // Puedes personalizar el mensaje según tus necesidades

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipientNumber,
    type: "text",
    text: {
      preview_url: false,
      body: messageWsp,
    },
  };
  try {
    const response = axios
      .post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
    // console.log("Message sent:", response.data);
  } catch (error) {
    console.error(
      "Error sending message:",
      error.response ? error.response.data : error.message
    );
  }
}

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
  // console.log(resultadoSQL.rows);

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
    sendMessageWsp(req.body);
    // console.log(sendMessageWsp)
    // console.log(req.body)

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

app.post("/webhook", async (req, res) => {
  console.log("Incoming webhook message:", JSON.stringify(req.body, null, 2));
  const accessToken = process.env.GRAPH_API_TOKEN;
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
      url: `https://graph.facebook.com/v20.0/${business_phone_number_id}/messages`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
        Authorization: `Bearer ${accessToken}`,
      },
      data: {
        messaging_product: "whatsapp",
        status: "read",
        message_id: message.id,
      },
    });
  }

  res.sendStatus(200);
});

// accepts GET requests at the /webhook endpoint. You need this URL to setup webhook initially.
// info on verification request payload: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  const verify_token = process.env.WEBHOOK_VERIFY_TOKEN;

  // check the mode and token sent are correct
  if (mode === "subscribe" && token === verify_token) {
    // respond with 200 OK and challenge token from the request
    res.status(200).send(challenge);
    console.log("Webhook verified successfully!");
  } else {
    // respond with '403 Forbidden' if verify tokens do not match
    res.sendStatus(403);
  }
});

// app.post("/sendmessage", async (req, res) => {
//   const recipient_number = "56998307778"; // Puedes cambiarlo a req.body.to si se recibe dinámicamente
//   const accessToken = GRAPH_API_TOKEN; //process.env.GRAPH_API_TOKEN; // Asegúrate de tener el token en tu .env
//   url = "https://graph.facebook.com/v20.0/102007099648965/messages";
//   payload = {
//     messaging_product: "whatsapp",
//     recipient_type: "individual",
//     to: recipient_number,
//     type: "text",
//     text: {
//       preview_url: false,
//       body: "Esta es una prueba de mensaje",
//     },
//   };
//   try {
//     const response = await axios
//       .post(url, payload, {
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//         },
//       })
//       .then((response) => {
//         console.log(response);
//         res.sendStatus(200);
//       })
//       .catch((error) => {
//         console.error("Error sending message:", error.message);
//         res.sendStatus(500);
//       });
//     console.log("Message sent:", response.data);
//     res.sendStatus(200);
//   } catch (error) {
//     console.error(
//       "Error sending message:",
//       error.response ? error.response.data : error.message
//     );
//     res.sendStatus(500);
//   }
// });

// app.post("/sendmessage", async(req,res)=>{
//   const message = "mensaje de prueba"
//   const recipient_number = '+56998307778' //process.env.GRAPH_API_TOKEN
//   console.log(recipient_number)
//   console.log('body: ', req.body)

//   try {
//     const response = await axios({
//       method: "POST",
//       url: `https://graph.facebook.com/v18.0/me/messages`,
//       headers: {
//         Authorization: `Bearer ${process.env.GRAPH_API_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//       data: {
//         messaging_product: "whatsapp",
//         recipient: {
//           whatsapp_number: recipient_number,
//         },
//         message: {
//           text: {
//             body: message,
//           },
//         },
//       },
//     });
//     console.log(response.data);
//     res.sendStatus(200);
//   } catch (error) {
//     console.error(error);
//     res.sendStatus(500);
//   }
// })

const PORT = process.env.PORT;
app.listen(PORT, () => {
  // console.log({process})
  console.log(`Server running at http://localhost:${PORT}/`);
});

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
