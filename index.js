const { v1: uuid } = require("uuid");
const { GraphQLError } = require("graphql");

const { ApolloServer } = require("@apollo/server");
const { startStandaloneServer } = require("@apollo/server/standalone");

const books = require("./data/books.js");
const authors = require("./data/authors.js");

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
  Author: {
    bookCount: async (a) => {
      return Book.collection.filter((book) => book.author === a.name).length;
    },
  },

  Query: {
    bookCount: async () => Book.collection.countDocuments(),
    authorCount: async () => Author.collection.countDocuments(),
    allBooks: async (root, args) =>
      books
        .filter((book) => (args.author ? book.author === args.author : true))
        .filter((ab) => (args.genre ? ab.genres.includes(args.genre) : true)),

    allAuthors: async (root, args) => {
      switch (args.hasBooks) {
        case "YES": {
          console.log(
            "allAuthors: YES",
            Author.collection.map((a) => a.bookCount)
          );
          // TODO: author.bookCount on jostain syystä undefined?
          return Author.collection.filter((author) => author.bookCount > 0);
        }
        case "NO": {
          return Author.collection.filter((author) => author.bookCount === 0);
        }
        default: {
          return authors;
        }
      }
    },
  },

  Mutation: {
    addBook: async (root, args) => {
      console.log("addBook", args);
      if (!args.author) {
        throw new GraphQLError("Author not found");
      }
      if (Book.collection.find((book) => book.title === args.title)) {
        throw new GraphQLError("Book already exists");
      }
      const book = new Book({ ...args });
      // books = books.concat(book);
      // authors = authors.concat({ name: book.author });
      return book.save();
    },
    addAuthor: async (root, args) => {
      console.log("addAuthor", args);
      if (Author.collection.find((author) => author.name === args.name)) {
        throw new GraphQLError("Author already exists");
      }
      const author = new Author({ ...args });
      // authors = authors.concat(author);
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
