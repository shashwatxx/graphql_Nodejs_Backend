const { validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../model/user');

exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty) {
        const error = new Error("Validation Failed");
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;


    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({
            email: email,
            name: name,
            password: hashedPassword
        });
        const result = await user.save();
        res.status(201).json(
            {
                message: "User created!",
                userId: result._id
            });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }






};

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            const error = new Error("User does not exists!");
            error.statusCode = 401;
            throw error;
        }
        loadedUser = user;
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Wrong Password");
            error.statusCode = 401;
            throw error;
        }
        const token = jwt.sign({
            email: loadedUser.email,
            userId: loadedUser._id.toString()
        }, 'areyrryehsabmilkehumkopagalbanarahe', { expiresIn: '1h' });

        res.status(200).json({ token: token, userId: loadedUser._id.toString() });
    }
    catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }




}

exports.getStatus = async (req, res, next) => {
    console.log("User Id  " + req.userId);

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User Not Found");
            error.statusCode = 403;
            throw error;
        }

        res.status(200).json({
            message: "Success", status: user.status
        });

    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }
};

exports.updateStatus = async (req, res, next) => {
    const newStatus = req.body.status;

    try {
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("User Not Found");
            error.statusCode = 403;
            throw error;
        }
        user.status = newStatus;
        await user.save();
        res.status(200).json({
            message: "Status Updated",
            status: newStatus
        });
    } catch (err) {
        if (!err.statusCode) {
            err.statusCode = 500;
        }
        next(err);
    }




};