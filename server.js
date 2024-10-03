const cors = require("cors");
const next = require("next");
const Pusher = require("pusher");
const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv").config();
const Sentiment = require("sentiment");

const dev = process.env.NODE_ENV !== "production";
const port = process.env.PORT || 3000;

const app = next({ dev });
const handler = app.getRequestHandler();
const sentiment = new Sentiment();

// Ensure that your Pusher credentials are properly set in the .env file
// Using the specified variables
const pusher = new Pusher({
  appId: process.env.PUSHER_APP_ID,
  key: process.env.PUSHER_APP_KEY,
  secret: process.env.PUSHER_APP_SECRET,
  cluster: process.env.PUSHER_APP_CLUSTER,
  useTLS: true,
});

app
  .prepare()
  .then(() => {
    const server = express();

    server.use(cors());
    server.use(bodyParser.json());
    server.use(bodyParser.urlencoded({ extended: true }));

    server.get("*", (req, res) => {
      return handler(req, res);
    });

    // In-memory chat history
    const chatHistory = { messages: [] };

    // Endpoint to handle new messages
    server.post("/message", (req, res) => {
      const { user = null, message = "", timestamp = +new Date() } = req.body;
      const sentimentScore = sentiment.analyze(message).score;

      const chat = { user, message, timestamp, sentiment: sentimentScore };

      chatHistory.messages.push(chat);
      pusher.trigger("chat-room", "new-message", { chat });

      res.status(200).json({ status: "Message sent" });
    });

    // Endpoint to fetch all messages
    server.post("/messages", (req, res) => {
      res.json({ ...chatHistory, status: "success" });
    });

    // Start the server
    server.listen(port, (err) => {
      if (err) throw err;
      console.log(`> Ready on http://localhost:${port}`);
    });
  })
  .catch((ex) => {
    console.error(ex.stack);
    process.exit(1);
  });
