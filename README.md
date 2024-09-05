# EventCreator
School Project to create a smart contract that can handle the creation of a event. You will be able to register by paying a fee, registration will be closed after a deadline. You should be able to create a new event, open and close registration and handle payments.


Added Reentrancy protection from open zeppelin, just an added layer of security. The contract itself is secure because only the owner can withdraw money, but then again having more security is never bad for the end-user.

I used calldata instead of memory in the createEvent function, this can help gas optimisation because calldata is read-only and directly points to the data. Memory requires copying and therfor calldata can be more gas efficient.

In my struct i ordered it in a specific way to save gas. Because each storage slot is 32 bytes, solidity packs variables into storage slots to make efficient use of space so when you place them right, variables that fit within single storage slots can be packed together. and voila you have saved space and gas.

I also made the createEvent function external, external is more gas efficient than public since if it is external it can only be reached from outside the contract which saves gas.