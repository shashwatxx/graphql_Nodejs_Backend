const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const multer = require('multer');
const graphqlexpress = require('express-graphql');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');


const app = express();
const fileStorage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, 'images');
    },
    filename: (req, file, callback) => {
        callback(null, new Date().toISOString() + '_' + file.originalname);
    },
});
const fileFilter = (req, file, callback) => {
    if (file.mimetype === 'image/png' ||
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg') {
        callback(null, true);
    }
    else { callback(null, false); }
};

const MONGODB_URI =
    "mongodb+srv://shashwat:2eAxUNsTSMK3N3Um@cluster0.ofh41.mongodb.net/socialNet?retryWrites=true&w=majority";


app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter: fileFilter }).single('image'));

app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');  //Replace '*' from domain which you want to access
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    next();
});

app.use('/graphql', graphqlexpress.graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver
}));


app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const errorData = error.data;
    res.status(status).json({ message: message, error: errorData });

});

mongoose.connect(MONGODB_URI, { useUnifiedTopology: true, useNewUrlParser: true })
    .then(result => {
        app.listen(8080);
    })
    .catch(err => console.log(err));
