const express = require('express');
const { body } = require('express-validator');

const User = require('../model/user');
const authController = require('../controllers/auth');
const isAuth = require('../middleware/is-auth');
const router = express.Router();


router.put('/signup', [body('email')
    .isEmail()
    .withMessage("Please enter valid email").custom(async (value, { req }) => {
        const userDoc = await User.findOne({ email: value });
        if (userDoc) {
            return Promise.reject("E-mail Address Already exists");
        }

    }).normalizeEmail(),
body('password').trim().isLength({ min: 5 }),
body('name').trim().not().isEmpty(),
], authController.signup);

router.post('/login', authController.login);


router.get('/status', isAuth, authController.getStatus);
router.patch('/status', isAuth, [body('status').trim().not().isEmpty()], authController.updateStatus);

module.exports = router;