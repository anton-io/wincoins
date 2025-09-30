# WinCoins - Decentralized Prediction Market

A decentralized prediction solution for managing events with multiple outcomes on the blockchain.

## Overview

The WinCoins contract allows users to:
- Create events with multiple possible outcomes.
- Place predictions on different outcomes.
- Set prediction deadlines for events.
- Resolve events and distribute winnings proportionally to winners.


## Features

- **Event Creation**: Anyone can create an event with multiple outcomes and a prediction deadline.
- **Proportional Prediction Pools**: Users can bet on any outcome, creating separate pools for each.
- **Time-Limited Prediction**: Prediction is only allowed before the specified deadline.
- **Proportional Payouts**: Winners receive payouts proportional to their contribution to the winning pool.
- **Creator Control**: Only event creators can resolve their events.
- **Security**: Built with OpenZeppelin contracts for reentrancy protection.
