require("dotenv").config();
const cors = require("cors");
var jwt = require("express-jwt");
var jwks = require("jwks-rsa");
const jwtAuthz = require("express-jwt-authz");
const jwtDecode = require("jwt-decode");

const express = require("express");

const app = express();
const port = 4000;

const corsOptions = {
  origin: "http://localhost:3000",
};
app.use(cors(corsOptions));

if (!process.env.AUTH0_DOMAIN || !process.env.AUTH0_AUDIENCE) {
  throw "Make sure you have AUTH0_DOMAIN, and AUTH0_AUDIENCE in your .env file";
}

const Sequelize = require("sequelize");
const { STRING, INTEGER} = require("sequelize");

const sequelize = new Sequelize(
  `postgres://postgres:${process.env.PASSWORD}@localhost:5432/postgres`
);

var jwtCheck = jwt({
  secret: jwks.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"],
});

const checkScopes = jwtAuthz(["read:messages"]);

//app.use(jwtCheck);

// initial data for db
//
// const myUsers = [
//   { name: "Kris", email: "kris@gmail.com", password: 1234 },
//   { name: "Domi", email: "domi@gmail.com", password: 4321 },
//   { name: "Anton", email: "anton@gmail.com", password: 1324 },
// ];
//
// const myOffers = [
//   {
//     city: "Tilburg",
//     mainOfferImage:
//       "https://cf.bstatic.com/images/hotel/max1280x900/246/246072335.jpg",
//     UserId: 1,
//   },
//   {
//     city: "Amsterdam",
//     mainOfferImage:
//       "https://cf.bstatic.com/images/hotel/max1280x900/176/176854746.jpg",
//     UserId: 2,
//   },
//   {
//     city: "Leiden",
//     mainOfferImage:
//       "https://cf.bstatic.com/images/hotel/max1280x900/246/246068559.jpg",
//     UserId: 3,
//   },
// ];

const User = sequelize.define("Users", {
  name: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: false,
  },
  email: {
    type: Sequelize.STRING,
    allowNull: true,
    unique: true,
  },
  facebookuserid: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  }
});

const Offer = sequelize.define("Offers", {
  city: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: false,
  },
  mainOfferImage: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true,
  },
  UserId: {
    type: Sequelize.INTEGER,
    references: { model: "Users", key: "id" },
  },
});

User.hasMany(Offer);
Offer.belongsTo(User);

sequelize
  .sync({ force: false })
  //.then(() => Offer.truncate())
  //.then(() => Promise.all(myOffers.map(offer => Offer.create(offer))))
  //.then(() => Promise.all(myOffers.map(offer => Offer.create(offer))))
  .catch((err) => {
    console.error("Unable to create tables, shutting down...", err);
    process.exit(1);
  });

// app.get("/", cors({origin: '*'}), (req, res) => {
//  console.log('req made from localhost')
//     usersToShow = []

//     User.findAll()
//     .then(users => {
//       usersToShow = users
//       Offer.findAll()
//       .then(offers => {
//           res.json({ usersToShow, offers})
//       }).catch(err => console.log(err))
//     }).catch(err => console.log(err))
// });

app.get("/", (req, res) => {
  res.send("secure !");
});

app.get("/api/:id", jwtCheck, (req, res) => {
  //console.log('req headers extra...........................................', JSON.parse(req.headers.user_data))
  const { name, email } = JSON.parse(req.headers.user_data);
  const { sub, ...rest } = jwtDecode(req.headers.authorization);

  User.findOne({ where: { facebookuserid: sub } })
    .then((user) => {
      if (user) {
        Offer.findAll({ where: { UserId: user.id } })
          .then((offers) => res.json(offers.length < 1 ? null : offers))
          .catch((err) => console.log(err));
      } else {
        User.create({
          name,
          email,
          facebookuserid: sub,
        }).then(() => res.json(null));
      }
    })
    .catch((err) => console.log(err));

  // .then(users => {
  //   data.users = users
  //   Offer.findAll()
  //   .then(offers => {
  //     data.offers = offers
  //       res.json(data)
  //   }).catch(err => console.log(err))
  // }).catch(err => console.log(err))
});

app.listen(port, () => {
  console.log(`app listens on ${port}`);
});
