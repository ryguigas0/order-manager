## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

### Create an order

```bash
curl --location --request POST 'http://localhost:3000/backoffice/orders' --header 'Content-Type: application/json' --data '{
    "customerId": "651f151522f29a0082a933ae",
    "customer": {
        "name": "John Doe",
        "email": "johndoe@email.com",
        "address": {
            "billing": "123 Main St, Anytown, USA",
            "delivery": "123 Main St, Anytown, USA"
        }
    },
    "items": [
        {
            "itemId": "451f151522f29a0082a933af",
            "itemName": "Laptop",
            "unitPrice": 1200.50,
            "quantity": 1
        },
        {
            "itemId": "451f151522f29a0082a933b0",
            "itemName": "Mouse",
            "unitPrice": 25.00,
            "quantity": 2
        }
    ],
    "payment": {
        "totalAmount": 1250.50,
        "paymentMethod": "pix"
    }
}'
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
