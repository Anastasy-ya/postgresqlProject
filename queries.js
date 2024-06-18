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

////////////////////////////начало 

// Функция для вставки записи в таблицу user_changes и возврата action_id
const insertUserChangeLog = (client, userId, action) => {
  const insertLogQuery = `INSERT INTO user_changes (user_id, action_date, action) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING action_id`;
  return client.query(insertLogQuery, [userId, action])
    .then(logResult => {
      if (logResult.rows.length === 0) {
        throw new Error('Failed to create log');
      }
      return logResult.rows[0].action_id;
    });
};

// Основная функция для создания пользователя
const createUser = (request, response) => {
  const { first_name, last_name, age, gender, problems } = request.body;

  // Проверка наличия всех обязательных полей
  if (!first_name || !last_name || !age || !gender || typeof problems === 'undefined' || !action) {
    return response.status(400).send('All fields are required');
  }

  // Проверка типов данных
  if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string' || typeof action !== 'string') {
    return response.status(400).send('Invalid data type');
  }

  // Проверка корректности возраста
  if (typeof age !== 'number' || age <= 17) {
    return response.status(400).send('Invalid age');
  }

  // Переменные для хранения идентификаторов
  let userId = null;
  let actionId = null;

  // Подключение к базе данных
  pool.connect()
    .then(client => {
      // Функция для освобождения клиента базы данных
      const releaseClient = () => {
        if (!client.released) {
          client.released = true;
          client.release();
        }
      };

      // Гарантируем завершение всех обращений к базе данных
      return client.query('BEGIN')
        .then(() => {
          // Вставка нового пользователя в таблицу users
          const insertUserQuery = `INSERT INTO users (first_name, last_name, age, gender, problems) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
          return client.query(insertUserQuery, [first_name, last_name, age, gender, problems]);
        })
        .then(result => {
          // Проверка успешности вставки пользователя
          if (result.rows.length === 0) {
            throw new Error('Failed to create user');
          }
          userId = result.rows[0].id;

          // Вставка записи в таблицу user_changes
          return insertUserChangeLog(client, userId, 'creating'); //проверить что работает
        })
        .then(insertedActionId => {
          // Сохранение actionId и завершение операции
          actionId = insertedActionId;
          return client.query('COMMIT')
            .then(() => {
              releaseClient();
              response.status(201).send(`User and log created with User ID: ${userId} and Log ID: ${actionId}`);
            });
        })
        .catch(error => {
          // Откат операции в случае ошибки
          return client.query('ROLLBACK')
            .then(() => {
              releaseClient();
              console.error('Database error:', error);
              response.status(500).send('An error occurred while creating the user and log');
            });
        })
        .finally(() => {
          // Освобождение клиента базы данных
          releaseClient();
        });
    })
    .catch(error => {
      // Обработка ошибки подключения к базе данных
      console.error('Connection error:', error);
      response.status(500).send('An error occurred while connecting to the database');
    });
};

// Основная функция для изменения пользователя
const updateUser = (request, response) => {
  const id = request.query.id;
  const { first_name, last_name, age, gender, problems } = request.body;

  if (!id) {
    return response.status(400).send('User ID is required');
  }

  // if (!first_name || !last_name || typeof age === 'undefined' || !gender || typeof problems === 'undefined') {
  //   return response.status(400).send('All fields are required');
  // }

  if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string') {
    return response.status(400).send('Invalid data type');//TODO подумать как проверить типы, но не делать замену обязательной
  }

  if (typeof age !== 'number' || age <= 17) {//TODO подумать как проверить типы, но не делать замену обязательной
    return response.status(400).send('Invalid age');
  }

  let client;
  let actionId = null;

  pool.connect()
    .then(connectedClient => {
      client = connectedClient;
      // Функция для освобождения клиента базы данных
      const releaseClient = () => {
        if (!client.released) {
          client.released = true;
          client.release();
        }
      };

      return client.query('BEGIN')
        .then(() => {
          const updateUserQuery = `UPDATE users SET first_name = $1, last_name = $2, age = $3, gender = $4, problems = $5 WHERE id = $6`;
          return client.query(updateUserQuery, [first_name, last_name, age, gender, problems, id]);
        })
        .then(result => {
          if (result.rowCount === 0) {
            throw new Error('User not found');
          }
          return insertUserChangeLog(client, id, 'update');
        })

        .then(insertedActionId => {
          actionId = insertedActionId;

          return client.query('COMMIT');
        })
        .then(() => {
          releaseClient();
          response.status(200).send(`User modified with ID: ${id}, Log ID: ${actionId}`);
        })
        .catch(error => {
          return client.query('ROLLBACK')
            .then(() => {
              releaseClient();
              if (error.message === 'User not found') {
                response.status(404).send(error.message);
              } else {
                console.error('Database error:', error);
                response.status(500).send('An error occurred while updating the user');
              }
            });
        })
        .finally(() => {
          releaseClient();
        });
    })
    .catch(error => {
      console.error('Connection error:', error);
      response.status(500).send('An error occurred while connecting to the database', error);
    });
};
////////////////////////////конец

// const updateUser = (request, response) => {
//   const id = request.query.id;
//   const { first_name, last_name, age, gender, problems } = request.body;

//   if (!id) {
//     return response.status(400).send('User ID is required');
//   }

//   if (!first_name || !last_name || typeof age === 'undefined' || !gender || typeof problems === 'undefined') {
//     return response.status(400).send('All fields are required');
//   }

//   if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string') {
//     return response.status(400).send('Invalid data type');
//   }

//   if (typeof age !== 'number' || age <= 0) {
//     return response.status(400).send('Invalid age');
//   }

//   pool.query(
//     'UPDATE users SET first_name = $1, last_name = $2, age = $3, gender = $4, problems = $5 WHERE id = $6',
//     [first_name, last_name, age, gender, problems, id],
//     (error, results) => {
//       if (error) {
//         console.error('Database error:', error);
//         return response.status(500).send('An error occurred while updating the user');
//       }

//       if (results.rowCount === 0) {
//         return response.status(404).send('User not found');
//       }

//       response.status(200).send(`User modified with ID: ${id}`);
//     }
//   );
// };

module.exports = {
  getUsers,
  createUser,
  updateUser,
};

//TODO добавить валидацию если будет время
//TODO проверить одинаковость кавычек

// посчитать количество строк в таблице product, у которых в category - electronics
// SELECT COUNT(*)
// FROM product
// WHERE category = 'electronics';



