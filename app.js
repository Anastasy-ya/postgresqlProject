const express = require('express');

const rateLimit = require('express-rate-limit');

const bodyParser = require('body-parser');

const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // за 15 мин
  max: 100, // максимум 100 обращений
});

const db = require('./queries');

require('dotenv').config();

const { PORT } = process.env;

const cors = require('cors');

const { requestLogger, errorLogger } = require('./middlewares/logger');
// const errorHandler = require('./middlewares/error');

app.use(cors({
  origin: [
    'http://localhost:5432',
  ],
}));

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use(requestLogger); // логгер запросов

app.use(limiter);

app.get('/', db.getUsers);
app.post('/create-user', db.createUser);
app.patch('/update-user', db.updateUser);
app.get('*', (_, res) => {
  return res.status(404).send('Invalid Page');
});

app.use(errorLogger); // логгер ошибок

// app.use(errors());

// app.use(errorHandler); // централизованный обработчик ошибок

app.listen(PORT, () => {
  console.log(`App running on port ${PORT}.`);
});