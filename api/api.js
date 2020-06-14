var express = require('express');
var router = express.Router();
var game = require('../core/game');


router.get('/cards', function(req, res) {
    res.json(game.getCards());
});
router.post('/reset', function(req, res) {
    game.resetGame();
    res.json();
});

module.exports = router;