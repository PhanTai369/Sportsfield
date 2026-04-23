const express = require('express');
const router = express.Router();
const favoriteController = require('../controllers/favorite.controller');
const { authMiddleware } = require('../middlewares/auth.middleware');

// Thêm sân vào danh sách yêu thích
router.post('/', authMiddleware, favoriteController.addFavorite);

// Xóa sân khỏi danh sách yêu thích
router.delete('/:fieldId', authMiddleware, favoriteController.removeFavorite);

// Lấy danh sách sân yêu thích của user
router.get('/', authMiddleware, favoriteController.getFavorites);

module.exports = router;