const { v1: uuid } = require("uuid");
const { GraphQLError } = require("graphql");

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

// const books = require("./data/books.js");
// const authors = require("./data/authors.js");

const db = require("./db.js");
const Book = require("./models/book.js");
const Author = require("./models/author.js");

const typeDefs = `
  enum hasBooks {
    YES
    NO
  }
  type Author {
    id: ID!
    name: String!
    born: Int
    bookCount: Int!
    test: Int
  }
  type Book {
    id: ID!
    title: String!
    published: Int!
    author: Author!
    genres: [String!]!
  }
  type Query {
    bookCount: Int!
    authorCount: Int!
    allBooks(author: String, genre: String): [Book!]!
    allAuthors(hasBooks: hasBooks): [Author!]!
    findAuthor(name: String!): Author
  }
  type Mutation {
    addBook(
      title: String!
      published: Int!
      author: String!
      genres: [String!]
    ): Book
    addAuthor(name: String!, born: Int): Author
    editAuthor(name: String!, setBornTo: Int!): Author
  }
`;

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      // TODO: cannot get nested query work...
      // Book.find({ "author.name": args.author })
      const books = await Book.find().populate("author").exec();
      return books
        .filter((book) =>
          args.author ? book.author.name === args.author : true
        )
        .filter((ab) => (args.genre ? ab.genres.includes(args.genre) : true));
    },
    allAuthors: async (root, args) => {
      switch (args.hasBooks) {
        case "YES": {
          console.log("hasBooks: yes");
          return Author.find({ bookCount: { $gt: 0 } });
          // it should find all authors that have books. However, empty list is returned and only one logline is at the console.
          // => hasBooks: yes
          // returns: []

          //return Author.find({ test: 1 });
          // it should find all authors since test is set to 1.
          // => hasBooks: yes
          // returns: []

          //return Author.find({ name: "joni" });
          // => hasBooks: yes
          // => bookCount
          // => test
          // returns: correct
        }
        case "NO": {
          console.log("hasBooks: no");
          return Author.find({ bookCount: { $eq: 0 } });
        }
      }
    },
    findAuthor: async (root, args) => {
      return Author.findOne({ name: args.name });
    },
  },

  Author: {
    test: async (root) => {
      console.log("test");
      return 1;
    },

    bookCount: async (root) => {
      console.log("bookCount");
      const books = await Book.find({ author: root.id });
      return books.length;
    },
  },

  Mutation: {
    addBook: async (root, args) => {
      if (!args.author) {
        throw new GraphQLError("Author not found");
      }
      if (Book.collection.find((book) => book.title === args.title)) {
        throw new GraphQLError("Book already exists");
      }
      const book = new Book({ ...args });
      return book.save();
    },

    addAuthor: async (root, args) => {
      if (Author.collection.find((author) => author.name === args.name)) {
        throw new GraphQLError("Author already exists");
      }
      const author = new Author({ ...args });
      return author.save();
    },

    editAuthor: (root, args) => {
      console.log("editAuthor", args);
      if (!args.name) {
        throw new GraphQLError("Author not given");
      }
      const author = authors.find((a) => a.name === args.name);

      if (!author) {
        return null;
      }
      const updatedAuthor = {
        ...author,
        born: args.setBornTo,
      };
      authors = authors.map((a) => (a.name === args.name ? updatedAuthor : a));
      return updatedAuthor;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

startStandaloneServer(server, {
  listen: { port: 4000 },
}).then(({ url }) => {
  console.log(`Server ready at ${url}`);
});
