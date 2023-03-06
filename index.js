const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Mobile resale server is working fine");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.htrvoxc.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const productCollection = client
      .db("secondTimeAround")
      .collection("products");
    const userCollection = client.db("secondTimeAround").collection("users");
    const orderCollection = client.db("secondTimeAround").collection("orders");
    const paymentCollection = client
      .db("secondTimeAround")
      .collection("payments");

    /* categorized product api */
    app.get("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { categoryID: parseInt(id) };
      // console.log(query);
      const products = await productCollection.find(query).toArray();

      const unpurchased = products.filter(
        (product) => product.isProductPurchased === false
      );
      res.send(unpurchased);
    });

    /* add a product by seller */
    app.post("/products/add", async (req, res) => {
      const productInfo = req.body.add;
      const product = await productCollection.insertOne(productInfo);
      res.send(product);
    });

    /* get my products */
    app.get("/products", async (req, res) => {
      const name = req.query.name;
      const query = { Seller: name };
      // console.log(query);
      const myProduct = await productCollection.find(query).toArray();
      res.send(myProduct);
    });

    /* delete my product */
    app.delete("/products/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    });

    /* advertise my product */
    app.put("/products/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const info = req.body;
      const updateDoc = {
        $set: {
          isAdvertise: info.advertised,
        },
      };
      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    /* get advertised products */
    app.get("/advertisedproduct", async (req, res) => {
      const query = { isAdvertise: true, isProductPurchased: false };
      const products = await productCollection.find(query).toArray();
      res.send(products);
    });

    /* My Buyers */
    app.get("/mybuyer", async (req, res) => {
      const sellerName = req.query.name;
      const query = { Seller: sellerName };
      const buyers = await paymentCollection.find(query).toArray();
      res.send(buyers);
    });

    /* filter user by role */
    app.get("/users", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    /* add users to database */
    app.post("/users", async (req, res) => {
      const info = req.body;
      console.log(info);
      const filter = { email: info.email };
      const existedUser = await userCollection.findOne(filter);
      if (existedUser) {
        return res.send({ message: "This user already have been added" });
      }
      const user = await userCollection.insertOne(info);
      res.send(user);
    });

    /* add orders to database */
    app.post("/orders", async (req, res) => {
      const orderDetail = req.body;
      const order = await orderCollection.insertOne(orderDetail);
      res.send(order);
    });

    /* get orders by email */
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    /* get orders by id */
    app.get("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    });
    /* get price */
    app.post("/create-payment-intent", async (req, res) => {
      const price = req.body.price;
      const amount = price * 100;

      // Create a PaymentIntent with the order amount and currency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    /* payment post */
    app.post("/payment", async (req, res) => {
      const info = req.body;
      const payment = await paymentCollection.insertOne(info);
      const id = info.orderID;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionID: info.transaction,
        },
      };
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      const query = { name: info.device };
      const paymentStatus = {
        $set: {
          isProductPurchased: true,
        },
      };
      const updatedProduct = await productCollection.updateOne(
        query,
        paymentStatus
      );
      res.send(payment);
    });

    /* Find all buyer */
    app.get("/buyers", async (req, res) => {
      const query = { role: "Buyer" };
      const allBuyers = await userCollection.find(query).toArray();
      res.send(allBuyers);
    });

    /* delete a buyer */
    app.delete("/buyers/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const deleteBuyer = await userCollection.deleteOne(filter);
      res.send(deleteBuyer);
    });

    /* find all seller */
    app.get("/sellers", async (req, res) => {
      const query = { role: "Seller" };
      const allSellers = await userCollection.find(query).toArray();
      res.send(allSellers);
    });

    /* delete a seller */
    app.delete("/sellers", async (req, res) => {
      const name = req.query.name;
      const filter = { name: name };
      const deleteSeller = await userCollection.deleteOne(filter);
      const productSeller = { Seller: name };
      const deleteProducts = await productCollection.deleteMany(productSeller);
      res.send(deleteSeller);
    });

    /* verify a seller */
    app.put("/sellers", async (req, res) => {
      const name = req.query.name;
      const filter = { name: name };
      const info = req.body;
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          verified: info.verification,
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const productFilter = { Seller: name };
      const updateProduct = {
        $set: {
          isSellerVerified: info.verification,
        },
      };
      const finalProduct = await productCollection.updateOne(
        productFilter,
        updateProduct,
        options
      );
      res.send(result);
    });

    app.put("/productstate", async (req, res) => {
      const id = req.query.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const info = req.body;
      const updateDoc = {
        $set: {
          isProductPurchased: info.purchaseStatus,
        },
      };
      const result = await productCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });
  } finally {
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`buying second hand phone on port ${port}`);
});
