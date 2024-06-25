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

// Обработка ошибок подключения к базе данных
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1); // Завершение процесса в случае непредвиденной ошибки
});

// Функция для получения всех пользователей
const getUsers = (_, response) => {
  pool.query('SELECT * FROM persons ORDER BY id ASC', (error, results) => {
    if (error) {
      console.error('Database query error', error);
      // Установить статус 500 в случае ошибки базы данных и отправить сообщение об ошибке
      return response.status(500).send('An error occurred while fetching users');
    }
    response.status(200).json(results.rows);
  });
};

// Функция для вставки записи в таблицу person_changes и возврата action_id
const insertUserChangeLog = (client, userId, action) => {
  const insertLogQuery = `INSERT INTO person_changes (user_id, action_date, action) VALUES ($1, CURRENT_TIMESTAMP, $2) RETURNING action_id`;
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
  if (!first_name || !last_name || !age || !gender || typeof problems === 'undefined') {
    return response.status(400).send('All fields are required');
  }

  // Проверка типов данных
  if (typeof first_name !== 'string' || typeof last_name !== 'string' || typeof gender !== 'string') {
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
          const insertUserQuery = `INSERT INTO persons (first_name, last_name, age, gender, problems) VALUES ($1, $2, $3, $4, $5) RETURNING id`;
          return client.query(insertUserQuery, [first_name, last_name, age, gender, problems]);
        })
        .then(result => {
          // Проверка успешности вставки пользователя
          if (result.rows.length === 0) {
            throw new Error('Failed to create user');
          }
          userId = result.rows[0].id;

          // Вставка записи в таблицу person_changes
          return insertUserChangeLog(client, userId, 'create user'); //проверить что работает
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
              response.status(500).send('An error occurred while creating the user and log. Error:', error);
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

  // Проверяем наличие обязательного поля id
  if (!id) {
    return response.status(400).send('User ID is required');
  }

  // Проверка типов данных только если поля переданы
  if (first_name !== undefined && typeof first_name !== 'string' ||
      last_name !== undefined && typeof last_name !== 'string' ||
      gender !== undefined && typeof gender !== 'string') {
    return response.status(400).send('Invalid data type'); // Проверка типов данных для строк
  }

  if (age !== undefined && (typeof age !== 'number' || age <= 0)) {
    return response.status(400).send('Invalid age'); // Проверка типа данных и значения возраста
  }

  let client;
  let actionId = null;

  // Подключение к базе данных
  pool.connect()
    .then(connectedClient => {
      client = connectedClient;
      
      // Функция для освобождения клиента базы данных
      const releaseClient = () => {
        if (!client.released) {
          client.released = true;
          client.release(); // Освобождение клиента, возвращение его в пул подключений
        }
      };

      // Начало операции
      return client.query('BEGIN')
        .then(() => {
          // Создание запроса для обновления только тех полей, которые переданы
          const fields = [];
          const values = [];
          let index = 1;

          if (first_name !== undefined) {
            fields.push(`first_name = $${index++}`);
            values.push(first_name); // Добавление имени в массив значений
          }
          if (last_name !== undefined) {
            fields.push(`last_name = $${index++}`);
            values.push(last_name); // Добавление фамилии в массив значений
          }
          if (age !== undefined) {
            fields.push(`age = $${index++}`);
            values.push(age); // Добавление возраста в массив значений
          }
          if (gender !== undefined) {
            fields.push(`gender = $${index++}`);
            values.push(gender); // Добавление пола в массив значений
          }
          if (problems !== undefined) {
            fields.push(`problems = $${index++}`);
            values.push(problems); // Добавление проблем в массив значений
          }

          // Добавление id в массив values
          values.push(id);

          // Создание запроса для обновления
          const updateUserQuery = `UPDATE persons SET ${fields.join(', ')} WHERE id = $${index}`;
          return client.query(updateUserQuery, values); // Выполнение запроса обновления
        })
        .then(result => {
          if (result.rowCount === 0) {
            throw new Error('User not found'); // Обработка случая, когда пользователь не найден
          }
          return insertUserChangeLog(client, id, 'update user'); // Вставка записи в лог изменений пользователя
        })
        .then(insertedActionId => {
          actionId = insertedActionId;
          return client.query('COMMIT'); // Завершение операции
        })
        .then(() => {
          releaseClient(); // Освобождение клиента
          response.status(200).send(`User modified with ID: ${id}, Log ID: ${actionId}`); // Отправка успешного ответа
        })
        .catch(error => {
          return client.query('ROLLBACK') // Откат операции в случае ошибки
            .then(() => {
              releaseClient(); // Освобождение клиента
              if (error.message === 'User not found') {
                response.status(404).send(error.message); // Отправка ошибки, если пользователь не найден
              } else {
                console.error('Database error:', error);
                response.status(500).send('An error occurred while updating the user'); // Отправка общей ошибки
              }
            });
        })
        .finally(() => {
          releaseClient(); // Освобождение клиента в любом случае
        });
    })
    .catch(error => {
      console.error('Connection error:', error);
      response.status(500).send('An error occurred while connecting to the database. Error:', error); // Обработка ошибки подключения к базе данных
    });
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
};

//TODO добавить валидацию если будет время
//TODO подумать о рефакторинге крупных функций
//TODO написать тесты



