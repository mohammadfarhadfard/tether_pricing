const axios = require("axios");
const readline = require("readline");
require("dotenv").config();
let NOBITEX = process.env.NOBITEX_Route;
let WALLEX = process.env.WALLEX_Route;
let BITPIN = process.env.BITPIN_Route;

//reading data from console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// data from WALLEX
async function fetchData() {
  try {
    const response = await axios.get(WALLEX);
    const asks = response.data.result.ask || [];
    const bids = response.data.result.bid || [];
    return { asks, bids };
  } catch (error) {
    console.error("Error fetching data:", error);
    return { asks: [], bids: [] };
  }
}

// data from NOBITEX
async function getOrderBook(action, amountRequested) {
  try {
    const response = await axios.get(NOBITEX);
    const buy = response.data.bids;
    const sell = response.data.asks;

    let totalPriceNobitex = 0;
    let totalAmountNobitex = 0;

    if (action.toLowerCase() === "buy") {
      // buying from NOBITEX
      for (let order of sell) {
        const price = parseFloat(order[0]);
        const availableAmount = parseFloat(order[1]);

        if (amountRequested <= availableAmount) {
          totalPriceNobitex += price * amountRequested;
          totalAmountNobitex += amountRequested;
          break;
        } else {
          totalPriceNobitex += price * availableAmount;
          totalAmountNobitex += availableAmount;
          amountRequested -= availableAmount;
        }
      }
    } else if (action.toLowerCase() === "sell") {
      // selling to NOBITEX
      for (let order of buy) {
        const price = parseFloat(order[0]);
        const availableAmount = parseFloat(order[1]);

        if (amountRequested <= availableAmount) {
          totalPriceNobitex += price * amountRequested;
          totalAmountNobitex += amountRequested;
          break;
        } else {
          totalPriceNobitex += price * availableAmount;
          totalAmountNobitex += availableAmount;
          amountRequested -= availableAmount;
        }
      }
    } else {
      console.log("Invalid action. Please specify 'buy' or 'sell'.");
      return;
    }

    // average price for NOBITEX
    const averagePriceNobitex = totalAmountNobitex > 0 ? totalPriceNobitex / totalAmountNobitex : 0;

    // fetch data from WALLEX
    const { asks, bids } = await fetchData();
    let totalPriceWallex = calculateTotal(asks, bids, action.toLowerCase(), amountRequested);

    // compare prices
    if (action.toLowerCase() === "buy") {
      console.log(`Total price for buying from NOBITEX: ${totalPriceNobitex / 10}`);
      console.log(`Total price for buying from WALLEX: ${totalPriceWallex}`);
      if (totalPriceNobitex /10 < totalPriceWallex) {
        console.log("NOBITEX is more economical for buying.");
      } else {
        console.log("WALLEX is more economical for buying.");
      }
    } else if (action.toLowerCase() === "sell") {
      console.log(`Total price for selling to NOBITEX: ${totalPriceNobitex / 10}`);
      console.log(`Total price for selling to WALLEX: ${totalPriceWallex}`);
      if (totalPriceNobitex /10 > totalPriceWallex) {
        console.log("NOBITEX is more economical for selling.");
      } else {
        console.log("WALLEX is more economical for selling.");
      }
    }

  } catch (error) {
    console.error("Error fetching order book:", error);
  }
}

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
    // Calculate total ```javascript
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

// Main function to get user input and call getOrderBook
async function main() {
  rl.question(`Do you want to buy or sell? (type "buy" or "sell") :`, async (action) => {
    rl.question("Enter the amount of tether: ", async (amount) => {
      await getOrderBook(action, parseFloat(amount));
      rl.close();
    });
  });
}

main();
