const Author = require("./models/author.js");
const Book = require("./models/book.js");
const User = require("./models/user.js");
const { GraphQLError } = require("graphql");

const resolvers = {
  Query: {
    me: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
          },
        });
      }
      return context.currentUser;
    },
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
    createUser: async (root, args) => {
      const user = new User({ ...args });
      return user.save().catch((error) => {
        throw new GraphQLError("Saving user failed", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.username,
            error,
          },
        });
      });
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== "secret") {
        throw new GraphQLError("Invalid username or password", {
          extensions: {
            code: "BAD_USER_INPUT",
            invalidArgs: args.password,
          },
        });
      }
      const userForToken = {
        username: user.username,
        id: user._id,
      };
      return { value: jwt.sign(userForToken, process.env.JWT_SECRET) };
    },

    addBook: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
          },
        });
      }

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

    addAuthor: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
          },
        });
      }

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

    editAuthor: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError("Not authenticated", {
          extensions: {
            code: "UNAUTHORIZED",
          },
        });
      }

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

module.exports = resolvers;
