const { buildASTSchema, buildSchema } = require('graphql');

module.exports = buildSchema(`
type Post {
    _id:ID!
    title:String
    content:String!
    imageUrl:String!
    creator:User!
    createdAt:String!
    updatedAt:String!
}

type User {
    _id:ID!
    name:String!
    email:String!
    status:String!
    password:String
    posts:[Post!]

}

input UserInputData {
    email: String!
    name:String!
    password:String!
}

type RootMutation {
createUser(userInput:UserInputData) :User!
}

schema {
    mutation:RootMutation
}

`);