const axios = require("axios");
const readline = require("readline");
require("dotenv").config();
const getOrderBook = require('./nobitex')

//reading data from console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// function to calculate total cost/revenue
function calculateTotal(asks, bids, action, amount) {
  if (action === 'buy') {
    // Calculate total cost for buying
    let totalCost = 0;
    for (const ask of asks) {
      const quantity = Math.min(ask.quantity, amount);
      totalCost += ask.price * quantity;
      amount -= quantity;
      if (amount <= 0) break; // Stop if we've accounted for the full amount
    }
    return totalCost;
  } else if (action === 'sell') {
    // Calculate total revenue for selling
    let totalRevenue = 0;
    for (const bid of bids) {
      const quantity = Math.min(bid.quantity, amount);
      totalRevenue += bid.price * quantity;
      amount -= quantity;
      if (amount <= 0) break; // Stop if we've accounted for the full amount
    }
    return totalRevenue;
  } else {
    return null;
  }
}
module.exports.calculateTotal = calculateTotal

// Main function to get user input and call getOrderBook
async function main() {
  rl.question(`Do you want to buy or sell? (type "buy" or "sell") :`, async (action) => {
    rl.question("Enter the amount of tether: ", async (amount) => {
      await getOrderBook.getOrderBook(action, parseFloat(amount));
      rl.close();
    });
  });
}

main();