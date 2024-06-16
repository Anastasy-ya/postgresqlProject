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

app.get("/", db.getUsers);
app.post("/create-user", db.createUser);
app.patch("/update-user", db.updateUser);

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}.`);
});