const express = require('express');
const router = express.Router();
const { getCampusLocations } = require('../services/locationService');

router.get('/campus', (req, res) => {
  const locations = getCampusLocations();
  res.status(200).json({
    success: true,
    data: { locations },
  });
});

module.exports = router;
