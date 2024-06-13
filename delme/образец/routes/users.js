// const { celebrate, Joi, errors } = require('celebrate');
const router = require('express').Router();
const {
  getUsers,
  getUserById,
  getUserData,
  changeProfileData,
  changeProfileAvatar,
} = require('../controllers/users');
const {
  getUserByIdValidation,
  changeProfileDataValidation,
  changeProfileAvatarValidation,
} = require('../middlewares/validation');

router.get('/', getUsers);

router.get('/me', getUserData);
router.patch('/me', changeProfileDataValidation, changeProfileData);
router.patch('/me/avatar', changeProfileAvatarValidation, changeProfileAvatar);
router.get('/:_id', getUserByIdValidation, getUserById);

module.exports = router;
