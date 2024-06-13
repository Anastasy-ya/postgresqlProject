const mongoose = require('mongoose');
const { isEmail, isURL } = require('validator'); // , isStrongPassword

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    minlength: 2,
    maxlength: 30,
    default: 'Жак-Ив Кусто',
  },
  about: {
    type: String,
    minlength: 2,
    maxlength: 30,
    default: 'Исследователь',
  },
  avatar: {
    type: String, // mongoose.SchemaTypes.Url
    default: 'https://pictures.s3.yandex.net/resources/jacques-cousteau_1604399756.png',
    validate: [isURL, 'Invalid avatar URL'],
  },
  email: {
    type: String,
    unique: true,
    required: true,
    validate: [isEmail, 'Invalid Email'],
  },
  password: {
    type: String,
    select: false,
    required: true,
    // validate: [isStrongPassword, 'Password is too simple!'],
  },
});

userSchema.methods.toJSON = function s() { // преобразование объекта название метода
  const user = this.toObject(); // преобразовать в js объект
  delete user.password;

  return user;
};

module.exports = mongoose.model('user', userSchema);
