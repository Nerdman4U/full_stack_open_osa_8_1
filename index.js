const { v1: uuid } = require("uuid");
const jwt = require("jsonwebtoken");

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

const db = require("./db.js");
const Book = require("./models/book.js");
const Author = require("./models/author.js");
const User = require("./models/user.js");

const typeDefs = require("./schema.js");
const resolvers = require("./resolvers.js");

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null;
    if (auth) {
      const decodedToken = jwt.verify(auth, process.env.JWT_SECRET);
      const currentUser = await User.findById(decodedToken.id);
      return { currentUser };
    }
  },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
