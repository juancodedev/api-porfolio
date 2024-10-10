// Configurar cabeceras para autenticar la API de WhatsApp
const headers = {
  Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
  "Content-Type": "application/json",
};

// Endpoint para recibir mensajes
app.post("/webhook", (req, res) => {
  const { entry } = req.body;

  // Verifica si la solicitud tiene mensajes
  if (
    entry &&
    entry.length > 0 &&
    entry[0].changes &&
    entry[0].changes[0].value.messages
  ) {
    const messages = entry[0].changes[0].value.messages;
    const message = messages[0];
    const from = message.from; // Número de WhatsApp del remitente
    const text = message.text.body; // Texto del mensaje recibido

    console.log(`Mensaje recibido de ${from}: ${text}`);

    // Responder al mensaje
    const responseMessage = `Recibido: ${text}`;
    sendMessage(from, responseMessage);
  }

  res.sendStatus(200);
});

// Función para enviar mensajes
const sendMessage = (to, message) => {
  const data = {
    messaging_product: "whatsapp",
    to: to,
    text: { body: message },
  };

  axios
    .post(
      `${process.env.WHATSAPP_API_URL}/${process.env.WHATSAPP_PHONE_ID}/messages`,
      data,
      { headers }
    )
    .then((response) => console.log("Mensaje enviado:", response.data))
    .catch((error) =>
      console.error(
        "Error enviando mensaje:",
        error.response ? error.response.data : error.message
      )
    );
};

// Endpoint para verificar el webhook
app.get("/webhook", (req, res) => {
  const verifyToken = "your_verify_token"; // Define un token de verificación
  const { mode, token, challenge } = req.query;

  if (mode === "subscribe" && token === verifyToken) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
