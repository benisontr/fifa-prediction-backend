const express = require('express');
const protect = require('../middlewares/auth.middleware');
const {
  createPrediction,
  getMyPredictions,
  updatePrediction,
  deletePrediction,
} = require('../controllers/prediction.controller');

const router = express.Router();

router.post('/predictions', protect, createPrediction);
router.get('/predictions/my', protect, getMyPredictions);
router.put('/predictions/:id', protect, updatePrediction);
router.delete('/predictions/:id', protect, deletePrediction);

module.exports = router;
