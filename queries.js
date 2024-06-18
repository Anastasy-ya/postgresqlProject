const { Pool } = require('pg');

require('dotenv').config();

const { USER, HOST, PASSWORD, DATABASE, } = process.env;
const DATABASE_URL = 'postgresql://' + USER + ':' + PASSWORD + '@' + HOST + '/' + DATABASE + '?sslmode=require';

const pool = new Pool({
  connectionString: DATABASE_URL,
  //временное решение до подключения ssl сертификата
  ssl: {
    rejectUnauthorized: false,
  },
});

// const makeLog = (request, response) => {

//   pool.query(
//     `INSERT INTO user_changes (user_id, action_date, action) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING action_id`,
//     [user_id, action],
//     (error, results) => {
//       if (error) {
//         console.error('logs are not created. Database error:', error);
//         return response.status(500).send('An error occurred while creating the user');
//       }
  
//       if (results.rows.length === 0) {
//         return response.status(500).send('logs are not created. Failed to create user');
//       }
  
//       response.status(201).send(`logs created. User added with ID: ${results.rows[0].action_id}`);
//     }
//   );
// };

const getUsers = (request, response) => {
  pool.query('SELECT * FROM users ORDER BY id ASC', (error, results) => {
    if (error) {
      return response.status(error.status).send(error.message);
    }
    response.status(200).json(results.rows);
  });
};

// const createUser = (request, response) => {
//   const { first_name, last_name, age, gender, problems } = request.body;

//   if (!first_name || !last_name || !age || !gender || typeof problems === 'undefined') {
//     return response.status(400).send('All fields are required');
//   }

//   if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string') {
//     return response.status(400).send('Invalid data type');
//   }

//   if (typeof age !== 'number' || age <= 0) {
//     return response.status(400).send('Invalid age');
//   }

//   pool.query(
//     `INSERT INTO users (first_name, last_name, age, gender, problems) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
//     [first_name, last_name, age, gender, problems],
//     (error, results) => {
//       if (error) {
//         console.error('Database error:', error);
//         return response.status(500).send('An error occurred while creating the user');
//       }

//       if (results.rows.length === 0) {
//         return response.status(500).send('Failed to create user');
//       }

//       response.status(201).send(`User added with ID: ${results.rows[0].id}`);

//     }
//   );
// };

////////////////////////////


////////////////////////////

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
    'UPDATE users SET first_name = $1, last_name = $2, age = $3, gender = $4, problems = $5 WHERE id = $6',
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

//TODO добавить валидацию если будет время

// посчитать количество строк в таблице product, у которых в category - electronics
// SELECT COUNT(*)
// FROM product
// WHERE category = 'electronics';



