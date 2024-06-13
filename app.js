const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const db = require("./queries");
require("dotenv").config();

const { PORT } = process.env;

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.get("/", (request, response) => {
  response.json({ info: "Node.js, Express, and Postgres API" });
});

app.get("/users", db.getUsers);
app.post("/create-user", db.createUser);
app.put("/update-user", db.updateUser);

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}.`);
});