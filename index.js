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
      const books = await Book.find().populate("author");
      return books
        .filter((book) =>
          args.author ? book.author.name === args.author : true
        )
        .filter((ab) => (args.genre ? ab.genres.includes(args.genre) : true));
    },
    allAuthors: async (root, args) => {
      const authors = await Author.find();

      switch (args.hasBooks) {
        case "YES": {
          console.log("hasBooks: yes");

          // 1. find all authors that have books (not working)
          // return Author.find({ bookCount: { $gt: 0 } });
          // => "hasBooks: yes"
          // => []

          // 2. find authors where test is 1 (not working)
          //return Author.find({ test: 1 });
          // => "hasBooks: yes"
          // => []

          // 3. find author by name (working)
          //return Author.find({ name: "joni" });
          // => "hasBooks: yes"
          // => "bookCount"
          // => "test"
          // => correct
          // 4. find all (working)
          // Author.find()

          const result = [];
          for (const author of authors) {
            const books = await Book.find({ author: author._id });
            if (books.length > 0) {
              result.push(author);
            }
          }
          return result;
        }
        case "NO": {
          const result = [];
          for (const author of authors) {
            const books = await Book.find({ author: author._id });
            if (books.length === 0) {
              result.push(author);
            }
          }
          return result;
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

      try {
        book.save();
      } catch (error) {
        throw new GraphQLError("Saving book failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.title,
            error,
          },
        });
      }

      return book;
    },

    addAuthor: async (root, args) => {
      if (Author.collection.find((author) => author.name === args.name)) {
        throw new GraphQLError("Author already exists");
      }

      let author;
      author = new Author({ ...args });

      try {
        author.save();
      } catch (error) {
        throw new GraphQLError("Saving author failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      }

      return author;
    },

    editAuthor: async (root, args) => {
      console.log("editAuthor", args);
      if (!args.name) {
        throw new GraphQLError("Author not given");
      }
      const author = await Author.findOne({ name: args.name });
      if (!author) {
        throw new GraphQLError("Author not found");
      }
      author.born = args.setBornTo;

      try {
        author.save();
      } catch (error) {
        throw new GraphQLError("Saving author failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.name,
            error,
          },
        });
      }

      return author;
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
