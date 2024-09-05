import hre, { ethers } from "hardhat";
import { expect } from "chai";
import { EventCreator } from "../typechain-types";
// import { ReentrancyAttack } from "../typechain-types";
import { deployEventCreatorFixture } from "./fixtures/deployFixture";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("EventCreator", function () {
    let eventCreator: EventCreator;
    // let reentrancyAttack: ReentrancyAttack;
    let owner: any;
    let addr1: any;
    let addr2: any;

    beforeEach(async function () {
        const { eventCreator: deployedEventCreator, deployer } = await loadFixture(deployEventCreatorFixture);
        eventCreator = deployedEventCreator as any;
        owner = deployer;
        [addr1, addr2] = await ethers.getSigners();
    });

    it("should create an event", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        const event = await eventCreator.events(0);
        expect(event.name).to.equal("Test Event");
    });

    it("should revert when trying to create an event with a past deadline", async function () {
        const pastDeadline = Math.floor(Date.now() / 1000) - 3600;
        await expect(eventCreator.createEvent("Past Event", pastDeadline)).to.be.revertedWith("Deadline must be in the future.");
    });

    it("should not reopen registration if max participants have been reached", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);

        for (let i = 0; i < 10; i++) {
            const participant = (await ethers.getSigners())[i + 1];
            await eventCreator.connect(participant).register(0, { value: ethers.parseEther("0.05") });
        }

        await expect(eventCreator.openRegistration(0)).to.be.revertedWith("Cannot reopen: Max participants reached.");
    });

    it("should close the event when maxParticipants is reached", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);

        for (let i = 0; i < 10; i++) {
            const participant = (await ethers.getSigners())[i + 1];
            await eventCreator.connect(participant).register(0, { value: ethers.parseEther("0.05") });
        }
        await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") }))
            .to.be.revertedWith("Registration is closed.");

        const event = await eventCreator.events(0);
        expect(event.isOpen).to.be.false;
    });

    it("should not open registration if already open", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.openRegistration(0)).to.be.revertedWith("Registration is already open.");
    });

    it("should open and close registration", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.closeRegistration(0);
        let event = await eventCreator.events(0);
        expect(event.isOpen).to.equal(false);

        await eventCreator.openRegistration(0);
        event = await eventCreator.events(0);
        expect(event.isOpen).to.equal(true);
    });

    it("should register a participant", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
        const participants = await eventCreator.getParticipants(0);
        expect(participants[0]).to.equal(addr2.address);
    });


    it("should not allow organizer to register", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.register(0, { value: ethers.parseEther("0.05") })).to.be.revertedWith("Organizer cannot register for their own event.");
    });


    it("should not allow double registration", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
        await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") })).to.be.revertedWith("Address has already registered for this event.");
    });

    it("should handle too low registration fee", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.01") })).to.be.revertedWithCustomError(eventCreator, "TooLow");
    });

    it("should handle too high registration fee", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await expect(eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.1") })).to.be.revertedWithCustomError(eventCreator, "TooMuch");
    });

    it("should withdraw funds", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.connect(addr2).register(0, { value: ethers.parseEther("0.05") });
        await eventCreator.closeRegistration(0);
        const initialBalance = await ethers.provider.getBalance(owner.address);
        await eventCreator.withdraw(0);
        const finalBalance = await ethers.provider.getBalance(owner.address);
        expect(finalBalance).to.be.gt(initialBalance);
    });
    it("should revert withdrawal if there are no funds in the contract", async function () {
        await eventCreator.createEvent("Test Event", Math.floor(Date.now() / 1000) + 3600);
        await eventCreator.closeRegistration(0);

        await expect(eventCreator.withdraw(0)).to.be.revertedWith("No funds available to withdraw.");
    });

    it("should create an event with the maximum name length", async function () {
        const maxLengthName = 'A'.repeat(256);
        await eventCreator.createEvent(maxLengthName, Math.floor(Date.now() / 1000) + 3600);
        const event = await eventCreator.events(0);
        console.log("Contract Address:", owner.address);
        expect(event.name).to.equal(maxLengthName);
    });


    it("should trigger fallback function and revert with 'Fallback Function'", async function () {
        const { eventCreator, deployer } = await loadFixture(deployEventCreatorFixture);

        await expect(deployer.sendTransaction({ to: eventCreator.getAddress(), data: "0x1234" }))
            .to.be.revertedWith("Fallback Function")
    });



    it("should trigger receive function and revert with 'Fallback Function'", async function () {
        const { eventCreator, deployer } = await loadFixture(deployEventCreatorFixture);

        await expect(deployer.sendTransaction({ to: eventCreator.getAddress(), value: ethers.parseEther("1.0") })).to.be.revertedWith("This contract does not accept Ether");
    });



});