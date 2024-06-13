const { Pool } = require("pg");
require("dotenv").config();

const { USER, HOST, PASSWORD, PORT, DATABASE,  } = process.env;
const DATABASE_URL = 'postgresql://' + USER + ':' + PASSWORD + '@' + HOST +'/' + DATABASE + '?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const getUsers = (request, response) => {
  pool.query("SELECT * FROM users ORDER BY id ASC", (error, results) => {
    if (error) {
      throw error;
    }
    response.status(200).json(results.rows);
  });
};

const createUser = (request, response) => {
  const { first_name, last_name, age, gender, problems } = request.body;
  pool.query(
    `INSERT INTO users (first_name, last_name, age, gender, problems) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [first_name, last_name, age, gender, problems],
    (error, results) => {
      if (error) {
        throw error;
      }
      response.status(201).send(`User added with ID: ${results.rows[0].id}`);
    }
  );
};

// предусмотреть крайние случаи: нет id, валидация, прописать обязательные поля - id
const updateUser = (request, response) => {
  const id = request.query.id;
  const { first_name, last_name, age, gender, problems } = request.body;
  // console.log(id)
  pool.query(
    "UPDATE users SET first_name = $1, last_name = $2, age = $3, gender = $4, problems = $5 WHERE id = $6",
    [first_name, last_name, age, gender, problems, id],
    (error, results) => {
      if (error) {
        console.log(error);
        throw error;
      }
      response.status(200).send(`User modified with ID: ${id}`);
    }
  );
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
};