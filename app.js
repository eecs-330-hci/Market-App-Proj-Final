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

//for user session
let searchItem = "";
let errorMessage = "";
let currEmail = "";
let currentCart = 0;
const searchOrderFoods = [];
let searchRecipe = "";
let orderErrorMessage = "";
let loggedIn = false;
let addPref = false;

//---------------------------------------
//-----------------------------RENDERS-------------------------


//SIGNUP/LOGIN FUNCTIONALITY--------
//start page
app.get("/", function(req, res) {
  if (loggedIn) {
    res.redirect("/homepage");
  } else {
    res.render("home");
  }
});

//signup page
app.get("/signup", function(req, res) {
  if (loggedIn) {
    res.render("loggedIn");
  } else {
    res.render("signup");
  }
});

//login page
app.get("/login", function(req, res) {
  if (loggedIn) {
    res.render("loggedIn");
  } else {
    let tempMessage = errorMessage;
    errorMessage = "";

    res.render("login", {
      errorMessage: tempMessage
    });
  }

});

//add-prefs page
app.get("/preferences", function(req, res) {
  if (!loggedIn) {
    res.render("notSignedIn");
  } else if (!addPref) {
    res.render("loggedIn");
  } else {
    let currentUser = User.find({}).sort({_id: -1}).limit(1);
    currentUser.exec(function(err, users) {
      console.log(users);
      res.render("preferences", {
        firstName: users[0].firstName
      });
    });
  }
});

//USER ROAMING FUNCTIONALITY--------
//user homepage
app.get("/homepage", function(req, res) {
  if (!loggedIn) {
    res.render("notSignedIn");
  } else {
    //console.log(currEmail);
    User.find({email: currEmail}, function(err, users) {
      if (!err && users.length > 0) {
        res.render("homepage", {
          prefs: users[0].foodPrefs
        });
      }
    });
  }

});

//market-profile page
app.get("/profile", function(req, res) {
  if (!loggedIn) {
    res.render("notSignedIn");
  } else {
    res.render("profile");
  }
});

//recipes page --- when user clicks on recipes button or clicks on suggested foods
app.get("/recipes", function(req, res) {
  if (!loggedIn) {
    res.render("notSignedIn");
  } else {
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
    };
    getContents();
  }

});

//order page
app.get("/order", function(req, res) {
  if (!loggedIn) {
    res.render("notSignedIn");
  } else {
    CartItem.find({}, function(err, items) {
      if (!err) {
          res.render("order", {
            features: evanstonMarket,
            cartItems: items,
            currentCart: currentCart,
            searchOrderFoods: searchOrderFoods,
            error: orderErrorMessage
          });
      }
    });
  }
});

//HANDLE SEARCHES-----
//search results page
app.get("/results", function(req, res) {
  if (!loggedIn) {
    res.render("notSignedIn");
  } else {
    const similarFoods = []; // for similar foods section
    if (searchItem !== "") { //if there was a search
      let similarType = searchItem.type;

      //gets foods of the same type as search
      Food.find({type: similarType}, function(err, foods) {
        foods.forEach(function(food) {
          if (food.name !== searchItem.name) {
            similarFoods.push(food);
          }
        });

        res.render("results", {
          noResults: "", // there was a result
          searchResults: [searchItem],
          similarFoods: similarFoods
        });

      });

    } else {
      res.render("results", { // there were no results
        noResults: "No foods found. Please go back to Home and try again.",
        searchResults: [],
        similarFoods: []
      });
    }
  }
});


//-----------------------POST REQUESTS-----------------------

//SIGNUP/LOGIN SUBMISSIONS--------
//start page post --- clicking on log in or sign up
app.post("/", function(req, res) {
  //get button clicked, redirect appropriately
  if (req.body.hasOwnProperty("signup")){
     res.redirect("/signup");
  } else if (req.body.hasOwnProperty("login")){
     res.redirect("/login");
  }
});


//sign up form submission --- creates new user
app.post("/signup", function(req, res) {
  currEmail = req.body.inputEmail;
  loggedIn = true;
  addPref = true;
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

//login form submission with error checking
app.post("/login", function(req, res) {
  let inputEmail = req.body.inputEmail;
  let password = req.body.inputPassword;
  User.find({email: inputEmail, password: password}, function(err, user) {
    if (user.length === 0) {
      errorMessage = "Entered incorect credentials. Try again."; // user session variable
      //that renders when redirected
      res.redirect("/login");
    } else {
      currEmail = inputEmail;
      loggedIn = true;
      res.redirect("/homepage");
    }
  });
});

//logout will clear all variables and empty the cart
app.post("/logout", function(req, res) {
  searchItem = "";
  errorMessage = "";
  currEmail = "";
  currentCart = 0;
  searchRecipe = "";
  orderErrorMessage = "";
  loggedIn = false;
  addPref = false;
  while (searchOrderFoods.length !== 0) {
    searchOrderFoods.pop();
  }
  CartItem.deleteMany({}, function(err) {
    if (!err) {
      res.redirect("/");
    }
  });
});

//PAGE SUBMISSIONS -------------------------
//add-prefs submission --- updates the foodPrefs property of user
//in database
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

//search submission --- uses regular expressions to find items
app.post("/search", function(req, res) {
  //console.log(req.body.query);
  let query = req.body.query;
  let regex = new RegExp(query,'i');

  //search using regular expressions
  Food.find({name: regex}).sort({name : -1}).exec(function(err, foods) {//finds and searches foods
    if (foods.length > 0) {
      foods.forEach(function(food) {
        searchItem = food; // update user var if found
      });
    } else {
      searchItem = ""; // nothing has been found
    }
  });
  res.redirect("/results");
});


//IN-VIEWS SUBMISSIONS ----------------
//order page form submission --- posts addition or removal
//of food to the cart
app.post("/change-food", function(req, res) {
  //if delete selected
  if (req.body.hasOwnProperty("delete")) {
    let name = req.body.delete;
    CartItem.count({name: name}, function(err, count) {
      if (count > 0) {

        CartItem.findOne({name: name}, function(err, item) {
          if (!err) {
            let quantity = item.quantity; //get quantity of CartItem
            currentCart -= item.price; // decrement price either way
            if (quantity === 1) { //remove the cartItem entirely
              CartItem.findOneAndDelete({name: name}, function(err) {
                if (!err) {
                  res.redirect("/order"); // redirect appropriately
                }
              });
            } else {//decrement cartItem's quantity appropriately
              CartItem.findOneAndUpdate({name: name}, {$inc: {quantity: -1}}, {new: true}, function(err, item) {
                if (!err) {
                  res.redirect("/order");
                }
              });
            }
          }
        });
      } else {
          res.redirect("/order"); // clicking delete when there's nothing to delete --- redirect page
        }
      });
  } else if (req.body.hasOwnProperty("add")) { // adding item
    let name = req.body.add;

    //if item already exists
    CartItem.count({name: name}, function(err, count) {
      if (count > 0) {
        CartItem.findOneAndUpdate({name: name}, {$inc: {quantity: 1}}, {new: true}, function(err, item) {
          if (!err) {
            currentCart += item.price; // increment quantity and price above
            res.redirect("/order");
          }
        });

      } else { // create new CartItem --- render on page
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

//search in order page --- similar to search, but can't abstract to a function because
//the function must update a different user session variable
//abstraction should be visited again
app.post("/orderSearch", function(req, res) {
  let query = req.body.query;
  let regex = new RegExp(query,'i');

  Food.find({name: regex}).sort({name : -1}).exec(function(err, foods) {
    if (foods.length > 0) {
      foods.forEach(function(food) {
        orderErrorMessage = "";
        searchOrderFoods.push(food);
      });
    } else {
      orderErrorMessage = "No foods found. Please try again."
    }
  });
  res.redirect("/order");
});


//submission for clear cart button
app.post("/clearOrder", function(req, res) {
  mongoose.connection.db.dropCollection('cartitems', function(err, result) { // clearing cart directly using mongoDB driver
    if (!err) {
      currentCart = 0;// reset user session var
      while (searchOrderFoods.length !== 0) {
        searchOrderFoods.pop();
      }
      orderErrorMessage = "";
      res.redirect("/order");
    }
  });
})

// app.post("/order", function(req, res) {
//   console.log(req.body.foodItem);
// });

//if recipes button is clicked
app.post("/getRecipe", function(req, res) {
  searchRecipe = req.body.recipeButton;
  console.log(searchRecipe);
  console.log(typeof(searchRecipe));
  res.redirect("/recipes");
});


//--------------------------ERROR PAGES --------------------
app.post("/loggedIn", function(req, res) {
  res.redirect("/homepage");
});

app.post("/notSignedIn", function(req, res) {
  res.redirect("/");
});



//------------port setup
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server started.");
});
