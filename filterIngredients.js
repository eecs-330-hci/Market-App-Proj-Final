const natural = require("natural"); // for POS tagger
const recipe = require(__dirname + "/scraper.js"); //to use js object returned by scraper

//set up naturalNode
const language_file = __dirname + "/node_modules/natural/lib/natural/brill_pos_tagger/data/English/tr_from_posjs.txt"
const lexicon_file = __dirname + "/node_modules/natural/lib/natural/brill_pos_tagger/data/English/lexicon_from_posjs.json";

const lexicon = new natural.Lexicon(lexicon_file, "N");
const ruleSet = new natural.RuleSet(language_file);
const tagger = new natural.BrillPOSTagger(lexicon, ruleSet);

const tokenizer = new natural.WordTokenizer();
//

//get all recipe info
const recipeInfo = async () => {
  return await recipe.recipeInformation(); // from scraper js
};

//extract ingredients array
const getIngredients = async () => {
  const ing = await recipeInfo();
  console.log(ing.ingredients); //get the ingredients list
  return ing.ingredients;
}

//tokenize and get POS of ingredients array
//const tokenizedIngredients = async () => { //*** NEEDS ANALYSIS AND OPTIMIZATION ***
exports.tokenizedIngredients = async () => {
  let ingredients = await getIngredients();

  let parsedIngredients = [];

  ingredients.forEach((ingredient) => {
    let tokenized = tokenizer.tokenize(ingredient); //separates each word/phrase into array --- splits on anything except alphabetic characters, digits and underscore
    let partsOfSpeech = tagger.tag(tokenized); //POS tags
    let temp = []; //temp array to add to and push into parsedIngredients
    partsOfSpeech.taggedWords.forEach((word) => {
      if (word.tag == "NN") { //check if noun --- USDA API works best with set nouns
        if (!search(measurements, word.token)) { // if it's not a measurement, add to temp
          temp.push(word.token);
        }
      }
    });
    parsedIngredients.push(temp); //
    //console.log(temp);
    //console.log("-------------------------");
  });
  console.log(parsedIngredients);
  return parsedIngredients;
}

//tokenizedIngredients(); // this will return a two dimensional array
// --- each top level element is an array containing the search terms for the USDA Search API for each
//     ingredient from the EatingWell recipe ingredients list; each of those arrays had measurements
//     filtered out as well using binary search on an array of measurement terms (below - naive)

function search(arr, element) {
  let start = 0;
  let limit = arr.length - 1;
  let mid;

  while (start < limit) {
    mid = Math.floor((start + limit) / 2);
    //console.log(arr[mid]);

    if (element < arr[mid]) {
      limit = mid;
    } else if (element > arr[mid]) {
      start = mid + 1;
    } else if (element === arr[mid]) {
      //console.log(element);
      return true; //for this search, want to validate the existance of the element
    }

  }

  console.log("None");
  return false;

}

const measurements = [
  "bunches",
  "cloves",
  "cup",
  "cups",
  "dash",
  "dash",
  "gallon",
  "gallons",
  "ingredient",
  "note",
  "ounce",
  "ounces",
  "pinch",
  "pint",
  "pints",
  "quart",
  "quarts",
  "salt", //temporary fix
  "tablespoon",
  "tablespoons",
  "teaspoon",
  "teaspoons"
]

// search(measurements, "gallon");
// console.log("---------");
// search(measurements, "ounces");
// console.log("---------");
// search(measurements, "ingredient");
