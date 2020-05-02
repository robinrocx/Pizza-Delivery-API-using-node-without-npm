Client Calls

//Users Endpoint
1) POST /users
=> Body should have the following fields firstName, lastName, email, address (an object comprising of line1, city, state, country and postal_code)

2) GET /users?email=XXX
=> Query parameter should have the email and a valid token in the header to access the user details

3) PUT /users
=> Body should have an email and any field that needs to be updated, a valid token in the header.

4) DELETE /users?email=XXX
=> Query parameter should have the email and a valid token in the header to delete the user.




//Tokens Endpoint
1) POST /tokens
=> Body should have an email and password to create a token.

2) GET /tokens?id=XXX
=> Query parameter should be the token



//Menu Endpoint
1) GET /menu
=> Body should have an email and a valid token in the header to access the menu (Products hardcoded, and saved in the stripe account).



//Cart Endpoint
1) POST /cart
=> Body should have an id of the product (from the menu), quantity and am email of the user, a valid token in the header to add an item to the cart

2) GET /cart?id=XXX
=> Body should have the user's email and query string should be the cartId in the user file.



//Order Endpoint
1) POST /order
=> Body should have the user's email, and an order will be created with status=created for the user using the items in the cart

//Payment Endpoint
1) POST /payment
=> Body should have an orderId and the users email. The order created will be paid and an email sent to the users email address