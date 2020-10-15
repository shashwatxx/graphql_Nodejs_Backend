const bcrypt = require('bcryptjs');
const validator = require('validator');
const { login } = require('../controllers/auth');
const jwt = require('jsonwebtoken');

const { clearImage } = require('../utils/file');

const User = require('../model/user');
const Post = require('../model/post');

module.exports = {
    createUser: async function ({ userInput }, req) {
        const errors = [];
        if (!validator.isEmail(userInput.email)) {
            errors.push({
                message: 'INVALID-EMAIL'
            });
        }
        if (validator.isEmpty(userInput.password) || !validator.isLength(userInput.password, { min: 5 })) {
            errors.push({
                message: 'PASSWORD-TOO-SHORT'
            });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid Input");
            error.data = errors;
            error.code = 422;
            throw error;
        }

        const existingUser = await User.findOne({
            email: userInput.email
        });
        if (existingUser) {
            const error = new Error("User Exists Already!");
            throw error;
        }
        const hashedPassword = await bcrypt.hash(userInput.password, 12);
        const user = new User({
            email: userInput.email,
            name: userInput.name,
            password: hashedPassword
        });
        const createdUser = await user.save();
        return { ...createdUser._doc, _id: createdUser._id.toString() };
    },

    login: async function ({ email, password }) {
        const user = await User.findOne({ email: email });
        if (!user) {
            const error = new Error("User does not exists!");
            error.statusCode = 401;
            throw error;
        }
        const isEqual = await bcrypt.compare(password, user.password);
        if (!isEqual) {
            const error = new Error("Wrong Password");
            error.statusCode = 401;
            throw error;
        }
        const token = jwt.sign({
            email: user.email,
            userId: user._id.toString()
        }, 'areyrryehsabmilkehumkopagalbanarahe', { expiresIn: '1h' });

        return { token: token, userId: user._id.toString() };
    }
    ,

    createPost: async function ({ postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title too Short!!' });
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content too Short!!' });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid Input");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("Unauthorized User");
            error.code = 401;
            throw error;
        }

        const post = new Post({
            title: postInput.title,
            content: postInput.content,
            imageUrl: postInput.imageUrl,
            creator: user

        });
        const createdPost = await post.save();
        user.posts.push(createdPost);
        await user.save();
        return {
            ...createdPost._doc,
            _id: createdPost._id.toString(),
            createdAt: createdPost.createdAt.toISOString(),
            updatedAt: createdPost.updatedAt.toISOString()
        };
    },


    posts: async function ({ page }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }
        if (!page) {
            page = 1;
        }
        const perPage = 2;
        const totalPosts = await Post.find().countDocuments();
        const posts = await Post.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * perPage)
            .limit(perPage)
            .populate('creator');
        return {
            posts: posts.map(p => {
                return { ...p._doc, _id: p.id.toString(), createdAt: p.createdAt.toISOString(), updatedAt: p.updatedAt.toISOString() };
            }), totalPosts: totalPosts
        };


    },

    post: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error("No Post Found");
            error.code = 404;
            throw error;
        }
        return {
            ...post._doc,
            _id: post._id.toString(),
            createdAt: post.createdAt.toISOString(),
            updatedAt: post.updatedAt.toISOString()
        };
    },

    updatePost: async function ({ id, postInput }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id).populate('creator');
        if (!post) {
            const error = new Error("No Post Found!!");
            error.code = 404;
            throw error;
        }
        if (post.creator._id.toString() !== req.userId.toString()) {
            const error = new Error("Not Authorized!!");
            error.code = 403;
            throw error;
        }
        const errors = [];
        if (validator.isEmpty(postInput.title) || !validator.isLength(postInput.title, { min: 5 })) {
            errors.push({ message: 'Title too Short!!' });
        }
        if (validator.isEmpty(postInput.content) || !validator.isLength(postInput.content, { min: 5 })) {
            errors.push({ message: 'Content too Short!!' });
        }
        if (errors.length > 0) {
            const error = new Error("Invalid Input");
            error.data = errors;
            error.code = 422;
            throw error;
        }
        post.title = postInput.title;
        post.content = postInput.content;
        if (postInput.imageUrl !== 'undefined') {
            post.imageUrl = postInput.imageUrl;
        }
        const updatePost = await post.save();
        return {
            ...updatePost._doc,
            _id: updatePost._id.toString(),
            createdAt: updatePost.createdAt.toISOString(),
            updatedAt: updatePost.updatedAt.toISOString()
        };
    }
    ,
    deletePost: async function ({ id }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }
        const post = await Post.findById(id);
        if (!post) {
            const error = new Error("No Post Found!!");
            error.code = 404;
            throw error;
        }
        if (post.creator.toString() !== req.userId.toString()) {
            const error = new Error("Not Authorized!!");
            error.code = 403;
            throw error;
        }
        try {
            clearImage(post.imageUrl);
            await Post.findByIdAndRemove(id);
            const user = await User.findById(req.userId);
            user.posts.pull(id);
            await user.save();
            return true;
        } catch (err) {
            err.code = 500;
            throw err;
        }





    },
    user: async function (args, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }

        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("No User Found");
            error.code = 404;
            throw error;
        }
        return { ...user._doc, _id: user._id.toString() };

    }
    ,
    updateStatus: async function ({ status }, req) {
        if (!req.isAuth) {
            const error = new Error("Not Authenticated!!");
            error.code = 401;
            throw error;
        }
        const user = await User.findById(req.userId);
        if (!user) {
            const error = new Error("No User Found");
            error.code = 404;
            throw error;
        }
        user.status = status;
        await user.save();
        return { ...user._doc, _id: user._id.toString() };
    }

}