const axios = require("axios");
const readline = require("readline");
require("dotenv").config();
let WALLEX = process.env.WALLEX_Route;
let NOBITEX = process.env.NOBITEX_Route;
let RAMZINEX = process.env.RAMZINEX_Route;
let TABDEAL = process.env.TABDEAL_Route;

//reading data from console
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

//data from wallex
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

// Fetch data from tabdeal
async function tabdeal() {
  try {
    const { data } = await axios.get(TABDEAL);
    const tabdeal_buys = data.bids.map((order) => ({
      price: parseFloat(order[0]), 
      quantity: parseFloat(order[1]), 
    }));
    const tabdeal_sells = data.asks.map((order) => ({
      price: parseFloat(order[0]), 
      quantity: parseFloat(order[1]), 
    }));
    return {
      buys: tabdeal_buys,
      sells: tabdeal_sells,
    };
  } catch (error) {
    console.error("Error fetching Tabdeal data:", error);
  }
}

//function to fetch data from ramzinex
async function ramzinex() {
  try {
    const response = await axios.get(RAMZINEX);
    
    const ramzinex_buys = response.data.data.buys.map(order => ({
      price: parseFloat(order[0]), 
      quantity: parseFloat(order[1])
    }));

    const ramzinex_sells = response.data.data.sells.map(order => ({
      price: parseFloat(order[0]),
      quantity: parseFloat(order[1])
    }));

    return {
      buys: ramzinex_buys,
      sells: ramzinex_sells
    };
  } catch (error) {
    console.error('Error fetching data:', error);
    return { buys: [], sells: [] };
  }
}

//data from nobitex
async function getOrderBook(action, amountRequested) {
  try {
    const response = await axios.get(NOBITEX);
    const buy = response.data.bids;
    const sell = response.data.asks;
    
    let totalPriceNobitex = 0;
    let totalAmountNobitex = 0;

    if (action.toLowerCase() === "buy") {
      //buying from nobitex
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
      //selling to nobitex
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

    //average price for nobitex
    const averagePriceNobitex = totalAmountNobitex > 0 ? totalPriceNobitex / totalAmountNobitex : 0;

    //fetch data from wallex
    const { asks, bids } = await fetchData();
    let totalPriceWallex = calculateTotal(asks, bids, action.toLowerCase(), amountRequested);

    //fetch data from ramzinex
    const { buys: ramzinexBuys, sells: ramzinexSells } = await ramzinex();

    //fetch data from tabdeal
    const { buys: tabdealBuys, sells: tabdealSells } = await tabdeal();

    //calculate total for ramzinex
    let totalPriceRamzinex = calculateTotal(ramzinexSells, ramzinexBuys, action.toLowerCase(), amountRequested);

    //calculate total for tabdeal
    let totalPriceTabdeal = calculateTotal(tabdealSells, tabdealBuys, action.toLowerCase(), amountRequested);

    //display total prices
    if (action.toLowerCase() === "buy") {
      console.log(`Total price for buying from NOBITEX: ${totalPriceNobitex / 10}`);
      console.log(`Total price for buying from WALLEX: ${totalPriceWallex}`);
      console.log(`Total price for buying from Ramzinex: ${totalPriceRamzinex / 10}`);
      console.log(`Total price for buying from Tabdeal: ${totalPriceTabdeal}`);
    } else {
      console.log(`Total price for selling to NOBITEX: ${totalPriceNobitex / 10}`);
      console.log(`Total price for selling to WALLEX: ${totalPriceWallex}`);
      console.log(`Total price for selling to Ramzinex: ${totalPriceRamzinex / 10}`);
      console.log(`Total price for selling to Tabdeal: ${totalPriceTabdeal}`);
    }

    //determine the most economical option for selling
    let maxPrice;
    let bestExchange;

    if (action.toLowerCase() === "sell") {
      maxPrice = Math.max(totalPriceNobitex / 10, totalPriceWallex, totalPriceRamzinex / 10, totalPriceTabdeal);
      bestExchange = maxPrice === totalPriceNobitex / 10 ? "NOBITEX" : maxPrice === totalPriceWallex ? "WALLEX" : maxPrice === totalPriceRamzinex / 10 ? "Ramzinex" : "Tabdeal";
    } else {
      //for buying, keep the previous logic
      maxPrice = Math.min(totalPriceNobitex / 10, totalPriceWallex, totalPriceRamzinex / 10, totalPriceTabdeal);
      bestExchange = maxPrice === totalPriceNobitex / 10 ? "NOBITEX" : maxPrice === totalPriceWallex ? "WALLEX" : maxPrice === totalPriceRamzinex / 10 ? "Ramzinex" : "Tabdeal";
    }

    console.log(`The most economical option for ${action} is: ${bestExchange} with a total price of ${maxPrice}`);

  } catch (error) {
    console.error("Error fetching order book:", error);
  }
}

//function to calculate total cost/revenue
function calculateTotal(asks, bids, action, amount) {
  if (action === 'buy') {
    //calculate total cost for buying
    let totalCost = 0;
    for (const ask of asks) {
      const quantity = Math.min(ask.quantity, amount);
      totalCost += ask.price * quantity;
      amount -= quantity;
      if (amount <= 0) break;
    }
    return totalCost;
  } else if (action === 'sell') {
    //calculate total revenue for selling
    let totalRevenue = 0;
    for (const bid of bids) {
      const quantity = Math.min(bid.quantity, amount);
      totalRevenue += bid.price * quantity;
      amount -= quantity;
      if (amount <= 0) break;
    }
    return totalRevenue;
  } else {
    return null;
  }
}

//main function to get user input and call getOrderBook
async function main() {
  rl.question(`Do you want to buy or sell? (type "buy" or "sell") :`, async (action) => {
    rl.question("Enter the amount of tether: ", async (amount) => {
      await getOrderBook(action, parseFloat(amount));
      rl.close();
    });
  });
}

main();