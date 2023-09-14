# Library-Management-API
An API for library management where admin can add books, users can browse different books and can book a specific book for a particular time period.

Role Based Access provision and 2 types of users would exist :
1. Admin - can perform all operations like adding books, updating books, etc.
2. Login users - can check all the books, book availability, book books, etc.
   
Tech Stack:
1. Web server : NodeJS
2. Database: MySQL

Endpoints:      

[POST] /api/signup - For creating a user   
[POST] /api/login - for the user to log into his account   
[POST] /api/books/create - for the admin to create a new book.   
[GET] /api/books?title={search_query} - for the users to check books with title   
[GET] /api/books/{book_id}/availability - to Get the availability of a particular book based on its id.   
[POST] /api/books/borrow -  for the users to book a book for a particular period   

