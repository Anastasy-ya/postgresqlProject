/* eslint-disable no-console */
const http2 = require('http2').constants;
const bcrypt = require('bcrypt');
const jsonWebToken = require('jsonwebtoken');
const User = require('../models/user');
const ConflictError = require('../errors/ConflictError');
const JsonWebTokenError = require('../errors/JsonWebTokenError');
const ValidationError = require('../errors/ValidationError');
const NotFound = require('../errors/NotFound');

const { NODE_ENV, JWT_SECRET } = process.env;

const createUser = (req, res, next) => {
  const { email, password } = req.body;
  // чтобы не нагружать сервер проверим сразу наличие полей
  if (!email || !password) {
    return next(new ValidationError('One of the fields or more is not filled'));
  }
  return bcrypt.hash(req.body.password, 10) // пароль - только строка
    .then((hash) => {
      User.create({
        ...req.body,
        password: hash,
      })
        .then((user) => res.status(http2.HTTP_STATUS_CREATED).send(user))
        .catch((err) => {
          if (err.code === 11000) {
            return next(new ConflictError('User already exists')); // 409
          }
          return next(err);
        });
    })
    .catch(next);
};

const login = (req, res, next) => {
  // Вытащить email и password
  const { email, password } = req.body;
  // чтобы не нагружать сервер проверим сразу наличие полей
  if (!email || !password) {
    return next(new ValidationError('One of the fields or more is not filled'));
  }
  // Проверить существует ли пользователь с таким email
  return User.findOne({ email })
    .select('+password')
    .orFail(() => new JsonWebTokenError('User not found'))
    .then((user) => {
      // Проверить совпадает ли пароль
      bcrypt.compare(password, user.password)
        .then((isValidUser) => {
          if (isValidUser) {
            // создать JWT
            const jwt = jsonWebToken.sign(
              {
                _id: user._id,
              },
              NODE_ENV === 'production' ? JWT_SECRET : 'dev-secret', // спрятать секретное слово
              { expiresIn: '7d' },
            );
            // переменная окружения хранит секретое слово для создания куки
            // прикрепить его к куке
            res.cookie('jwt', jwt, {
              maxAge: 360000,
              httpOnly: true,
              sameSite: true,
            });
            // Если совпадает - вернуть пользователя без данных пароля
            return res.send(user.toJSON());
          }
          // Если не совпадает - вернуть ошибку
          return next(new JsonWebTokenError('Invalid email or password')); // 403 Неправильный пароль Forbidden заменен 401
        });
    })
    .catch(next);
};

const getUserData = (req, res, next) => { // users/me
  // console.log(req.user, 'юзер');
  User.findById(req.user._id)
    .orFail(() => new NotFound('User ID is not found'))
    // если возвращен пустой объект, создать ошибку
    // и потом выполнение кода перейдет в catch, где ошибка будет обработана
    .then((user) => {
      res.status(http2.HTTP_STATUS_OK).send(user);
    })
    .catch((err) => {
      if (err.name === 'CastError') {
        return next(new ValidationError('Invalid user ID'));
      }
      return next(err);
    });
};

const getUsers = (_, res, next) => { // users
  User.find({})
    .then((user) => res.status(http2.HTTP_STATUS_OK).send(user))
    .catch(next);
};

const getUserById = (req, res, next) => {
  User.findById(req.params._id)
    .orFail(() => new NotFound('User ID is not found'))
    // если возвращен пустой объект, создать ошибку
    // и потом выполнение кода перейдет в catch, где ошибка будет обработана
    .then((user) => res.status(http2.HTTP_STATUS_OK).send(user))
    .catch((err) => {
      if (err.name === 'CastError') {
        return next(new ValidationError('Invalid user ID'));
      }
      return next(err);
    });
};

const changeProfileData = (req, res, next) => { // *
  User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      about: req.body.about,
      email: req.body.email,
      password: req.body.password,
    },
    {
      new: true,
      runValidators: true,
      upsert: false,
    },
  )
    .orFail(() => new NotFound('User ID is not found'))
    .then((user) => res.status(http2.HTTP_STATUS_OK).send(user))
    .catch((err) => {
      if (err.name === 'ValidationError') {
        return next(new ValidationError('Invalid user ID'));
      }
      return next(err);
    });
};

const changeProfileAvatar = (req, res, next) => { // *
  User.findByIdAndUpdate(
    req.user._id,
    {
      avatar: req.body.avatar,
    },
    {
      new: true,
      runValidators: true,
      upsert: false,
    },
  )
    .orFail(() => new NotFound('User ID is not found'))
    .then((user) => res.status(http2.HTTP_STATUS_OK).send(user))
    .catch((err) => {
      if (err.message === 'Not found') {
        throw new NotFound('User ID is not found');
      }
      return next(err);
    });
};

const logOut = async (_, res, next) => {
  try {
    res.clearCookie('jwt').send({ message: 'Logged out' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  changeProfileData,
  changeProfileAvatar,
  login,
  getUserData,
  logOut,
};
