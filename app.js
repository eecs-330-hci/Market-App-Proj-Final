const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const ejs = require('ejs');
const recipe = require(__dirname + "/scraper.js"); //to use js object returned by scraper

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//--------------------------------------------db--------------------------------------//
//setting up MongoDB using mongoose module
mongoose.connect("mongodb+srv://admin<PASS>@cluster0-kmcem.mongodb.net/harvestDB", { useNewUrlParser: true });
//password removed for obvious reasons
////////////
//setting up user Schema
const userSchema = new mongoose.Schema({
  email: String,
  firstName: String,
  lastName: String,
  phoneNumber: String,
  password: String,
  address: String,
  state: String,
  zip: String,
  foodPrefs: [String]
});

userSchema.index({firstName: 'text'}, {lastName: 'test'});
const User = mongoose.model("User", userSchema);
////////////

////////////
//setting up order cart schema
const cartItemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
  detail: String
});

cartItemSchema.index({name: 'text'});
const CartItem = mongoose.model("CartItem", cartItemSchema);
////////////

////////////
//--food item schema
const foodSchema = new mongoose.Schema({
  name: String,
  marker: String,
  type: String,
  price: Number
});

foodSchema.index({name: 'text'});
const Food = mongoose.model("Food", foodSchema);
////////////

////////////
//--market profile Schema
// const marketSchema = new mongoose.Schema({
//   name: String,
//   address: String,
//   phoneNumber: String,
//   features: [foodSchema]
// });
// marketSchema.index({name: 'text'});
// const Market = mongoose.model("Market", marketSchema);
///////////


const evanstonMarket = [
  {
    name: "Apples",
    marker: "apple",
    type: "fruit",
    price: 3.99
  },
  {
    name: "Grapes",
    marker: "grapes",
    type: "fruit",
    price: 2.99
  },
  {
    name: "Beans",
    marker: "beans",
    type: "protein",
    price: 4.99
  },
  {
    name: "Cheese",
    marker: "cheese",
    type: "dairy",
    price: 4.99
  }
]

//--------------------------------------------db--------------------------------------//

//
let searchItem = ""; // for user session
let errorMessage = ""; // for user session
let currEmail = ""; // for user session
let currentCart = 0;
const searchOrderFoods = [];
let searchRecipe = "";

//---------------------------------------
//Renders:

//start page
app.get("/", function(req, res) {
  res.render("home");
});

//signup page
app.get("/signup", function(req, res) {
  res.render("signup");
});

app.get("/login", function(req, res) {
  let tempMessage = errorMessage;
  errorMessage = "";
  res.render("login", {
    errorMessage: tempMessage
  });
});
//add-prefs page
app.get("/preferences", function(req, res) {
  let currentUser = User.find({}).sort({_id: -1}).limit(1);
  currentUser.exec(function(err, users) {
    console.log(users);
    res.render("preferences", {
      firstName: users[0].firstName
    });
  });

});

//user homepage
app.get("/homepage", function(req, res) {
  console.log(currEmail);
  User.find({email: currEmail}, function(err, users) {
    if (!err && users.length > 0) {
      res.render("homepage", {
        prefs: users[0].foodPrefs
      });
    }
  });
});

app.get("/recipes", function(req, res) {
  const recipeInfo = async () => {
    let input = searchRecipe;
    return await recipe.recipeInformation(searchRecipe); // from scraper js
  };
  const getContents = async () => {
    const contents = await recipeInfo();
    let tips = await contents.tips;
    let tipArray = ["No tips or footnotes."];
    if (tips.length === 0) {
      tips = tipArray
    }
    res.render("recipes", {
      ingredients: await contents.ingredients,
      title: await contents.title,
      instructions: await contents.instructions,
      tips: tips,
      image: await contents.image,
      summary: await contents.summary
    });
    //return ing.ingredients;
  };
  getContents();

});

//market-profile page
app.get("/profile", function(req, res) {
  res.render("profile");
});

app.get("/results", function(req, res) {
  const similarFoods = [];
  if (searchItem !== "") {
    console.log(searchItem);
    let similarType = searchItem.type;
    // console.log(similarType);
    Food.find({type: similarType}, function(err, foods) {

      foods.forEach(function(food) {
        if (food.name !== searchItem.name) {
          similarFoods.push(food);
          // console.log("pushed");
        }
      });
      res.render("results", {
        noResults: "",
        searchResults: [searchItem],
        similarFoods: similarFoods
      });
    });
  } else {
    res.render("results", {
      noResults: "No foods found. Please go back to Home and try again.",
      searchResults: [],
      similarFoods: []
    });
  }
});

app.get("/order", function(req, res) {
  CartItem.find({}, function(err, items) {
    if (!err) {
        res.render("order", {
          features: evanstonMarket,
          cartItems: items,
          currentCart: currentCart,
          searchOrderFoods: searchOrderFoods
        });
    }
  });
});

//------------------------------------

//
app.post("/", function(req, res) {
  //get button clicked, redirect appropriately
  if (req.body.hasOwnProperty("signup")){
     res.redirect("/signup");
  } else if (req.body.hasOwnProperty("login")){
     res.redirect("/login");
  }
});

app.post("/change-food", function(req, res) {
  if (req.body.hasOwnProperty("delete")) {
    let name = req.body.delete;
    CartItem.count({name: name}, function(err, count) {
      if (count > 0) {
        //
        CartItem.findOne({name: name}, function(err, item) {
          if (!err) {
            let quantity = item.quantity;
            currentCart -= item.price;
            if (quantity === 1) {
              CartItem.findOneAndDelete({name: name}, function(err) {
                if (!err) {
                  res.redirect("/order");
                }
              });
            } else {
              CartItem.findOneAndUpdate({name: name}, {$inc: {quantity: -1}}, {new: true}, function(err, item) {
                if (!err) {
                  res.redirect("/order");
                }
              });
            }
          }
        });
      } else {
        //alert("Item doesn't exist in the cart");
        res.redirect("/order");
        }
      });
  } else if (req.body.hasOwnProperty("add")) {
    let name = req.body.add;
    CartItem.count({name: name}, function(err, count) {
      if (count > 0) {
        CartItem.findOneAndUpdate({name: name}, {$inc: {quantity: 1}}, {new: true}, function(err, item) {
          if (!err) {
            currentCart += item.price;
            res.redirect("/order");
          }
        });

      } else {
          const item = new CartItem({
            name: req.body.add,
            price: req.body.price,
            quantity: 1,
            detail: "Arrives boxed and sealed."
          });

          item.save();
          currentCart += item.price;
          res.redirect("/order");
        }
      });
      // res.redirect("/order")
    }
});
//gets form data, inputs as an account object, pushes into accounts array
//no db integratation yet
app.post("/signup", function(req, res) {
  currEmail = req.body.inputEmail;
  const user = new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    phoneNumber: req.body.phoneNumber,
    email: req.body.inputEmail,
    password: req.body.inputPassword,
    foodPrefs: []
  });

  user.save();
  res.redirect("/preferences"); //redirects to next page, add-prefs page
});

app.post("/login", function(req, res) {
  // CartItem.deleteMany({}, function(err) {
  //   if (!err) {
  //     res.redirect("/");
  //   }
  // });
  let inputEmail = req.body.inputEmail;
  let password = req.body.inputPassword;
  User.find({email: inputEmail, password: password}, function(err, user) {
    if (user.length === 0) {
      errorMessage = "Entered incorect credentials. Try again.";
      res.redirect("/login");
    } else {
      currEmail = inputEmail;
      res.redirect("/homepage");
    }
  });
});

app.post("/logout", function(req, res) {
  searchItem = "";
  errorMessage = "";
  currEmail = "";
  currentCart = 0;
  searchRecipe = "";
  while (searchOrderFoods.length !== 0) {
    searchOrderFoods.pop();
  }
  CartItem.deleteMany({}, function(err) {
    if (!err) {
      res.redirect("/");
    }
  });
})

//submit button redirects
app.post("/preferences", function(req, res) {
  // accounts[0].foods = req.body.foods;
  User.find({}).sort({_id: -1}).limit(1).exec(function(err, user) {
    let emailFound = user[0].email;
    User.findOneAndUpdate({email: emailFound}, {foodPrefs: req.body.foods}, {new: true}, function(err, item) {
      if (!err) {
        console.log(item.foodPrefs);
        res.redirect("/homepage");
      }
    });
  });


});

app.post("/search", function(req, res) {
  //console.log(req.body.query);
  let query = req.body.query;
  let regex = new RegExp(query,'i');

  Food.find(//{
     //$or: [
        {name: regex}
        //{lastName: regex}
     //],
   //},
   ).sort({
     name : -1
   }).exec(function(err, foods) {
    //console.log(foods);
    if (foods.length > 0) {
      foods.forEach(function(food) {
        searchItem = food;
      });
    } else {
      searchItem = "";
    }

  });
  res.redirect("/results");
});

app.post("/orderSearch", function(req, res) {
  //console.log(req.body.query);
  let query = req.body.query;
  let regex = new RegExp(query,'i');

  Food.find({name: regex}).sort({name : -1}).exec(function(err, foods) {
    console.log(foods);
    console.log("im here");
    if (foods.length > 0) {
      foods.forEach(function(food) {
        console.log(food);
        searchOrderFoods.push(food);
      });
    }
  });
  res.redirect("/order");
});

app.post("/clearOrder", function(req, res) {
  mongoose.connection.db.dropCollection('cartitems', function(err, result) {
    if (!err) {
      currentCart = 0;
      while (searchOrderFoods.length !== 0) {
        searchOrderFoods.pop();
      }
      res.redirect("/order");
    }
  });
})

app.post("/order", function(req, res) {
  console.log(req.body.foodItem);
});

app.post("/getRecipe", function(req, res) {
  searchRecipe = req.body.recipeButton;
  console.log(searchRecipe);
  console.log(typeof(searchRecipe));
  res.redirect("/recipes");
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started.");
});
