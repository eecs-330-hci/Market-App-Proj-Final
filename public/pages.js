var availableTags = [
  "Apple",
  "Banana",
  "Beans",
  "Beef",
  "Broccoli",
  "Carrot",
  "Cheese",
  "Chicken",
  "Egg",
  "Grapes",
  "Ice-cream",
  "Lettuce",
  "Milk",
  "Onion",
  "Orange",
  "Potato",
  "Strawberry",
  "Turkey",
  "Yogurt",
];

  $(".searchbar").autocomplete({
      source: availableTags,
      maxLength: 8,
      select: function(event, ui) {
        console.log("Hello");
        //alert(ui.item.value);
      }
    });


function showOrder() {
  alert("Your order has been processed! A delivery fee of $3.99 will be added to your order.");
}
