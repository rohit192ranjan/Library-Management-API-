//----------Library-Management-API-----------//

const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
require('dotenv').config()

const secretKey = process.env.jwt_secret_key;
const dburl = process.env.db_url;
const dbuser = process.env.db_user;
const dbpassword = process.env.db_password;
const dbname = process.env.db_name;

// Create mySQL connection
const connection = mysql.createConnection({
  host: dburl,
  user: dbuser,
  password: dbpassword,
  database: dbname
});

// Connecting to mySQL
connection.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL: ', err);
    return;
  }
  console.log('Connected to MySQL database');
});

const app = express();

app.use(bodyParser.json());

//function to check user authentication
function authenticateAdmin(req, res, next) {
    const token = req.header('Authorization');
  
    if (!token) {
      return res.status(401).json({ message: 'Authentication token not provided' });
    }
  
    try {
      const decoded = jwt.verify(token, secretKey);
      if (!decoded.isAdmin) {
        return res.status(403).json({ message: 'You do not have permission to perform this action' });
      }
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }

// Register a User
app.post('/api/signup', (req, res) => {
  const { username, password, email } = req.body;
  const query = 'INSERT INTO users (username, password, email) VALUES (?, ?, ?)';
  connection.query(query, [username, password, email], (err, result) => {
    if (err) {
      console.error('Error registering user: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({
      status: 'Account successfully created',
      status_code: 200,
      user_id: result.id
    });
  });
});

// Login User
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const query = 'SELECT * FROM users WHERE username = ? AND password = ?';
  connection.query(query, [username, password], (err, result) => {
    if (err) {
      console.error('Error logging in: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (result.length === 0) {
      res.status(401).json({ status: 'Incorrect username/password provided. Please retry' });
    } else {
        const token = jwt.sign({ isAdmin: true }, secretKey);
      res.json({
        status: 'Login successful',
        status_code: 200,
        user_id: result[0].user_id,
        access_token: token
      });
    }
  });
});

// Add a New Book
app.post('/api/books/create', authenticateAdmin, (req, res) => {
  const { title, author, isbn } = req.body;
  const query = 'INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)';
  connection.query(query, [title, author, isbn], (err, result) => {
    if (err) {
      console.error('Error adding book: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({
      message: 'Book added successfully',
      book_id: result.insertId
    });
  });
});

// Search Books by Title
app.get('/api/books', (req, res) => {
  const { title } = req.query;
  const query = 'SELECT * FROM books WHERE title LIKE ?';
  connection.query(query, [`%${title}%`], (err, result) => {
    if (err) {
      console.error('Error searching books: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    res.json({ results: result });
  });
});

// Get Book Availability
app.get('/api/books/:book_id/availability', (req, res) => {
  const { book_id } = req.params;
  const query = 'SELECT * FROM books WHERE book_id = ?';
  connection.query(query, [book_id], (err, result) => {
    if (err) {
      console.error('Error getting book availability: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      const book = result[0];
      if (book.available) {
        res.json({
          book_id: book.book_id,
          title: book.title,
          author: book.author,
          available: true
        });
      } else {
        res.json({
          book_id: book.id,
          title: book.title,
          author: book.author,
          available: false,
          next_available_at: book.next_available_at
        });
      }
    }
  });
});

// Borrow a Book
app.post('/api/books/borrow', authenticateAdmin,  (req, res) => {
  const { book_id, user_id, issue_time, return_time } = req.body;
  const query = 'SELECT * FROM books WHERE book_id = ?';
  connection.query(query, [book_id], (err, result) => {
    if (err) {
      console.error('Error checking book availability: ', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }
    if (result.length === 0) {
      res.status(404).json({ error: 'Book not found' });
    } else {
      const book = result[0];
      if (book.available) {
        // Update book availability and insert booking into the database
        const updateQuery = 'UPDATE books SET available = false, next_available_at = ? WHERE book_id = ?';
        connection.query(updateQuery, [return_time, book_id], (err, updateResult) => {
          if (err) {
            console.error('Error booking the book: ', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
          }
          const bookingQuery = 'INSERT INTO bookings (book_id, user_id, issue_time, return_time) VALUES (?, ?, ?, ?)';
          connection.query(bookingQuery, [book_id, user_id, issue_time, return_time], (err, bookingResult) => {
            if (err) {
              console.error('Error booking the book: ', err);
              res.status(500).json({ error: 'Internal Server Error' });
              return;
            }
            res.json({
              status: 'Book booked successfully',
              status_code: 200,
              booking_id: bookingResult.booking_id
            });
          });
        });
      } else {
        res.status(400).json({ status: 'Book is not available at this moment' });
      }
    }
  });
});

// Start the server
app.listen(3000, () => {
  console.log('Server started on port 3000');
});
