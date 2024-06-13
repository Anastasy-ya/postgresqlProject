const router = require('express').Router();
const NotFound = require('../errors/NotFound');
const {
  createUser,
  login,
  logOut,
} = require('../controllers/users');
const {
  signUpValidation,
  signinValidation,
} = require('../middlewares/validation');
const auth = require('../middlewares/auth');
const cardRoutes = require('./cards');
const userRoutes = require('./users');

router.post('/signin', signinValidation, login); // авторизация
router.post('/signup', signUpValidation, createUser); // регистрация
router.get('/signout', logOut);

router.use(auth); // миддлвара проверяет наличие кук, располагается перед защищенными роутами

router.use('/cards', cardRoutes); // получает роуты, в которых содержатся запросы и ответы на них
router.use('/users', userRoutes);
router.use('*', (_, res, next) => {
  throw next(new NotFound('Not found'));
});

module.exports = router;
