const axios = require("axios");
require("dotenv").config();
const fetchData = require('./wallex')
const calculateTotal = require('./app')
let NOBITEX = process.env.NOBITEX_Route;
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
      const { asks, bids } = await fetchData.fetchData();
      let totalPriceWallex = calculateTotal.calculateTotal(asks, bids, action.toLowerCase(), amountRequested);
  
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

  module.exports.getOrderBook = getOrderBook;