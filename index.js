const express = require("express");
const cors = require("cors");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

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
