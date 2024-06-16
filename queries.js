const { Pool } = require("pg");
require("dotenv").config();

const { USER, HOST, PASSWORD, DATABASE, } = process.env;
const DATABASE_URL = 'postgresql://' + USER + ':' + PASSWORD + '@' + HOST + '/' + DATABASE + '?sslmode=require';

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

// добавить файл с расшифровкой ошибок
// добавить 404
const createUser = (request, response) => {
  const { first_name, last_name, age, gender, problems } = request.body;

  if (!first_name || !last_name || !age || !gender || typeof problems === 'undefined') {
    return response.status(400).send('All fields are required');
  }

  if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string') {
    return response.status(400).send('Invalid data type');
  }

  if (typeof age !== 'number' || age <= 0) {
    return response.status(400).send('Invalid age');
  }

  pool.query(
    `INSERT INTO users (first_name, last_name, age, gender, problems) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [first_name, last_name, age, gender, problems],
    (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return response.status(500).send('An error occurred while creating the user');
      }

      if (results.rows.length === 0) {
        return response.status(500).send('Failed to create user');
      }

      response.status(201).send(`User added with ID: ${results.rows[0].id}`);
    }
  );
};

const updateUser = (request, response) => {
  const id = request.query.id;
  const { first_name, last_name, age, gender, problems } = request.body;

  if (!id) {
    return response.status(400).send('User ID is required');
  }

  if (!first_name || !last_name || typeof age === 'undefined' || !gender || typeof problems === 'undefined') {
    return response.status(400).send('All fields are required');
  }

  if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string') {
    return response.status(400).send('Invalid data type');
  }

  if (typeof age !== 'number' || age <= 0) {
    return response.status(400).send('Invalid age');
  }

  pool.query(
    "UPDATE users SET first_name = $1, last_name = $2, age = $3, gender = $4, problems = $5 WHERE id = $6",
    [first_name, last_name, age, gender, problems, id],
    (error, results) => {
      if (error) {
        console.error('Database error:', error);
        return response.status(500).send('An error occurred while updating the user');
      }

      if (results.rowCount === 0) {
        return response.status(404).send('User not found');
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



