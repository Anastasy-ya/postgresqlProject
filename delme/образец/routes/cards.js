const router = require('express').Router();
const {
  createCard,
  getCards,
  deleteCardById,
  addLike,
  removeLike,
} = require('../controllers/cards');
const {
  createCardValidation,
  CardIdValidation,
} = require('../middlewares/validation');

router.get('/', getCards);
router.post('/', createCardValidation, createCard);
router.delete('/:_id', CardIdValidation, deleteCardById);
router.put('/:_id/likes', CardIdValidation, addLike);
router.delete('/:_id/likes', CardIdValidation, removeLike);

module.exports = router;
