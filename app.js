const axios = require("axios");
const readline = require("readline");
require("dotenv").config();
let NOBITEX = process.env.NOBITEX_Route;
// let WALLEX = process.env.WALLEX_Route

//reading data from console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//function to get the order book
async function getOrderBook(action, amountRequested) {
  try {
    const response = await axios.get(NOBITEX);

    const buy = response.data.bids;
    const sell = response.data.asks;

    let totalPrice = 0;
    let totalAmount = 0;

    if (action.toLowerCase() === "buy") {
      //buying
      for (let order of sell) {
        const price = parseFloat(order[0]);
        const availableAmount = parseFloat(order[1]);

        if (amountRequested <= availableAmount) {
          totalPrice += price * amountRequested;
          totalAmount += amountRequested;
          break;
        } else {
          totalPrice += price * availableAmount;
          totalAmount += availableAmount;
          amountRequested -= availableAmount;
        }
      }
    } else if (action.toLowerCase() === "sell") {
      //selling
      for (let order of buy) {
        const price = parseFloat(order[0]);
        const availableAmount = parseFloat(order[1]);

        if (amountRequested <= availableAmount) {
          totalPrice += price * amountRequested;
          totalAmount += amountRequested;
          break;
        } else {
          totalPrice += price * availableAmount;
          totalAmount += availableAmount;
          amountRequested -= availableAmount;
        }
      }
    } else {
      console.log("Invalid action. Please specify 'buy' or 'sell'.");
      return;
    }

    //average price
    const averagePrice = totalAmount > 0 ? totalPrice / totalAmount : 0;

    console.log(
      `Total price for ${action}ing ${totalAmount} is: ${totalPrice}`
    );
    console.log(`Average price for ${action}ing is: ${averagePrice}`);
  } catch (error) {
    console.error("Error fetching order book:", error);
  }
}

//function to ask from user
function askForDetails() {
  rl.question(
    'Do you want to buy or sell? (type "buy" or "sell"): ',
    (action) => {
      rl.question("Please enter the amount you want to request: ", (amount) => {
        getOrderBook(action, parseFloat(amount));
        //close the readline
        rl.close();
      });
    }
  );
}

//start the process
askForDetails();
