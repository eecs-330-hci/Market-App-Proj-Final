const cheerio = require('cheerio');
const rp = require('request-promise');

//const queries = ["chicken"]; //example query

//reconstructing the url for eatingwell.com
function constructURL(word) {
  let baseSearchURL = "http://www.eatingwell.com/search/results/?ingIncl=";
  let totalURL = baseSearchURL;
  let suffix = "&sort=re";
  // arr.forEach((element) => {
  //   totalURL += (element + ",");
  // });
  totalURL += word
  totalURL += suffix;
  // console.log(totalURL);
  return totalURL;
}

//requests new link
function getNewPage(link) {
  const options = {
    uri: link,
    transform: function(body) {
      return cheerio.load(body);
    }
  };
  // console.log(options);
  return rp(options);
}

//example query for now --- will change in the future
//let example = constructURL(queries);

exports.recipeInformation = function(query) {
  return getNewPage(constructURL(query))
    .then($ => {
      let recipeLink = $("article").first().find("a").eq(1).attr("href");
      return getNewPage(recipeLink); //request that new page
    })
    .then($ => {
      //--get title---
      let title = $(".recipeDetailHeader").first().text();
      //console.log(title);

      //---get ingredients---
      let ingredientsList = [];
      $(".listIngredients .checkListListItem span").map(function() {
        let ingredient = $(this).attr("title");
        if (typeof(ingredient) === "string") {
          ingredientsList.push(ingredient);
        }
      }).get();

      //console.log(ingredientsList);

      //---get recipe instructions---
      let instructionsList = [];
      $(".recipeDirectionsListItem").map(function() {
        let instruction = $(this).text();
        if (typeof(instruction) === "string") {
          if (instruction.length > 0) {
            instructionsList.push(instruction);
          }
        }
      }).get();

      //console.log(instructionsList);

      //--get recipe tips---
      let tipsList = [];
      let tempTips = $(".directionsSectionSteps");
      if (tempTips.length > 0) {
        $(".recipeFootnotes li").map(function() {
          tipsList.push($(this).text());
        }).get();
      }
      //console.log(tipsList);

      //---get image of recipe/end result ---
      let imageURL = $(".recipeDetailSummaryImageMain").attr("src");
      //console.log(imageURL);

      let summary = $(".recipeSubmitter p").text();

      result = {
        title: title,
        ingredients: ingredientsList,
        instructions: instructionsList,
        summary: summary,
        tips: tipsList,
        image: imageURL
      };
      return result;
      //console.log(result);
    })
    .catch(error => {
      console.log(error);
    });
};
